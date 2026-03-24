/* 
  RECLIP WAITLIST - SOURCE OF TRUTH (GLOBAL SYNC)
  -----------------------------------------------
  Webhook URL: Make.com integration
*/
const WEBHOOK_URL = "https://hook.eu1.make.com/3z2q4t9z5kiek7kthytd6l4onkzum4oz";

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

let isSubmitting = false;


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
// Removed UI update logic as per migration plan

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

        if (isSubmitting) return;

        try {
            isSubmitting = true;
            submitBtn.disabled = true;
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin" size="18"></i> Joining...`;
            lucide.createIcons();

            const formattedDate = new Date().toISOString();

            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    date: formattedDate
                })
            });

            // Make.com webhooks often return plain text "Accepted" instead of JSON
            let data = {};
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (text === "Accepted" || text === "OK") {
                    data.status = 'success';
                }
            }

            if (response.ok || data.status === 'success') {
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

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;

                document.getElementById('form-state').style.display = 'none';
                document.getElementById('success-state').style.display = 'block';

                showToast("Check your inbox for a message from Joseph 📧");
            } else if (data.status === 'duplicate') {
                // Handle duplicate specifically if your Make scenario is set up to return it
                showToast("You're already on the list! Check your inbox. 📧");
                // (Optional: handle UI transition here too if desired)
            } else {
                throw new Error("Webhook failed");
            }
        } catch (err) {
            console.error("Submission failed:");
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Claim Founder Perk <i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
            showToast("Something went wrong. Please try again.", "error");
        } finally {
            isSubmitting = false;
        }
    });
}

// Initialize on Load
checkPersistence();
