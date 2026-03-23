/* 
  RECLIP WAITLIST - SOURCE OF TRUTH (GLOBAL SYNC)
  -----------------------------------------------
  Webhook URL: Make.com integration
*/
const WEBHOOK_URL = "https://hook.eu1.make.com/i6wf4biwhabjqds5v0kwd9sm4mgdwxd7";
const COUNT_URL = "https://hook.eu1.make.com/mkmhsbve82quxrsa43lu3bnmaa7earou";
const TOTAL_CAP = 150;

// Initialize Icons
lucide.createIcons();

// Reveal Animation
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Accordion Logic
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
        const item = trigger.parentElement;
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
    });
});

// Toast Notification Utility
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `
        <i data-lucide="${iconName}" size="18"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Dynamic Waitlist Logic ---
const waitlistForm = document.getElementById('waitlist-form');
const counterContainer = document.getElementById('waitlist-counter-container');
const mainBtn = document.getElementById('main-submit-btn');
const footerBtn = document.getElementById('footer-cta-btn');

let globalCount = 0;
const PHASE_THRESHOLD = 50; // Keep for internal logic if needed, but UI uses 150 cap now


// 1. Initial State Check (Persistence)
function checkPersistence() {
    const isJoined = localStorage.getItem('reclip_joined') === 'true';
    if (isJoined) {
        const btnText = `Already Joined`;
        if (mainBtn) mainBtn.innerHTML = btnText;
        if (footerBtn) footerBtn.innerHTML = btnText;
    }
}

// 2. Fetch Global Count (The Truth)
async function fetchGlobalCount() {
    try {
        const response = await fetch(COUNT_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const text = await response.text(); // Read as text first
        const data = JSON.parse(text);
        globalCount = typeof data.total === 'number' ? data.total : parseInt(data.total) || 0;
        updateUI(globalCount);
    } catch (error) {
        console.error('Counter Fetch Error:', error);

        updateUI(0);
    }
}

// 3. Update UI & Phase Transition
function updateUI(count, animate = false) {
    if (!counterContainer) return;

    // Check Sold Out State
    if (count >= TOTAL_CAP) {
        counterContainer.innerHTML = `
            <div style="color: #ef4444; font-weight: 600; text-align: center;">
                <i data-lucide="info" size="14" style="vertical-align: middle; margin-right: 4px;"></i> 
                The first ${TOTAL_CAP} spots are taken. Stay tuned for the next drop!
            </div>
        `;

        const emailInput = waitlistForm?.querySelector('input');
        if (emailInput) emailInput.disabled = true;

        const btnText = `Waitlist Full`;
        if (mainBtn) {
            mainBtn.innerHTML = btnText;
            mainBtn.disabled = true;
        }
        if (footerBtn) {
            footerBtn.innerHTML = btnText;
            footerBtn.style.pointerEvents = 'none';
            footerBtn.style.opacity = '0.7';
        }
    } else {
        // Standard Counter UI
        counterContainer.innerHTML = `
            <i data-lucide="users" size="12" style="vertical-align: middle; margin-right: 4px;"></i> 
            <b class="${animate ? 'count-up' : ''}"><span id="member-count">${count}</span>/${TOTAL_CAP}</b> Inner Circle members joined.
        `;

        // Ensure buttons have original text if not joined
        if (localStorage.getItem('reclip_joined') !== 'true') {
            const btnText = `Claim Founder Perk <i data-lucide="arrow-right"></i>`;
            if (mainBtn) mainBtn.innerHTML = btnText;
            if (footerBtn) footerBtn.innerHTML = btnText;
        }
    }
    lucide.createIcons();
}

// 4. Form Handle (The Sync)
if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = waitlistForm.querySelector('button');
        const emailInput = waitlistForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim().toLowerCase();

        // Honeypot Check
        const honeypot = waitlistForm.querySelector('input[name="b_username"]');
        if (honeypot && honeypot.value) {
            console.warn("Bot detected via honeypot.");
            return;
        }

        // Local Duplicate Check
        const storedEmail = localStorage.getItem('reclip_email');
        if (localStorage.getItem('reclip_joined') === 'true' && email === storedEmail) {
            showToast("You have already secured your spot!", "error");
            return;
        }

        // Check if in the legacy list too
        const joinedEmails = JSON.parse(localStorage.getItem('reclip_joined_emails') || '[]');
        if (joinedEmails.includes(email)) {
            showToast("You have already secured your spot!", "error");
            return;
        }

        try {
            submitBtn.disabled = true;
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin" size="18"></i> Joining...`;
            lucide.createIcons();

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            // 1. Immediate UI Update (Manual Increment)
            globalCount++;
            updateUI(globalCount, true);

            // 2. Handle Status
            if (data.status === 'duplicate') {
                showToast("You're already on the list! Check your inbox. 📧");

                // Still mark as joined locally
                localStorage.setItem('reclip_joined', 'true');
                localStorage.setItem('reclip_email', email);

                const joinedEmails = JSON.parse(localStorage.getItem('reclip_joined_emails') || '[]');
                if (!joinedEmails.includes(email)) {
                    joinedEmails.push(email);
                    localStorage.setItem('reclip_joined_emails', JSON.stringify(joinedEmails));
                }

                const btnText = `Already Joined`;
                if (mainBtn) mainBtn.innerHTML = btnText;
                if (footerBtn) footerBtn.innerHTML = btnText;

                // Reset button but keep text
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;

                // Toggle UI to success state
                document.getElementById('form-state').style.display = 'none';
                document.getElementById('success-state').style.display = 'block';

            } else if (response.ok || data.status === 'success') {
                // Success path
                localStorage.setItem('reclip_joined', 'true');
                localStorage.setItem('reclip_email', email);

                const joinedEmails = JSON.parse(localStorage.getItem('reclip_joined_emails') || '[]');
                if (!joinedEmails.includes(email)) {
                    joinedEmails.push(email);
                    localStorage.setItem('reclip_joined_emails', JSON.stringify(joinedEmails));
                }

                const btnText = `Already Joined`;
                if (mainBtn) mainBtn.innerHTML = btnText;
                if (footerBtn) footerBtn.innerHTML = btnText;

                // Keep input and button enabled as requested
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;

                // Toggle UI to success state
                document.getElementById('form-state').style.display = 'none';
                document.getElementById('success-state').style.display = 'block';

                showToast("Check your inbox for a message from Joseph 📧");
            } else {
                throw new Error(data.message || "Webhook failed");
            }
        } catch (err) {
            console.error("Submission failed:");
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Claim Founder Perk <i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
            showToast("Something went wrong. Please try again.", "error");
        }
    });
}

// Initialize on Load
checkPersistence();
fetchGlobalCount();
