const appointmentForm = document.getElementById("appointment-form");
const formMessage = document.getElementById("form-message");
const appointmentsList = document.getElementById("appointments-list");
const noAppointments = document.getElementById("no-appointments");
const currentYearSpan = document.getElementById("current-year");

// שנה נוכחית בפוטר
if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
}

let appointments = [];

function renderAppointments() {
    appointmentsList.innerHTML = "";

    if (appointments.length === 0) {
        noAppointments.style.display = "block";
        return;
    }

    noAppointments.style.display = "none";

    appointments.forEach((appt, index) => {
        const li = document.createElement("li");
        li.className = "appointment-item";

        const mainDiv = document.createElement("div");
        mainDiv.className = "appointment-main";

        const nameEl = document.createElement("strong");
        nameEl.textContent = `${appt.fullName} – ${appt.phone}`;

        const metaEl = document.createElement("div");
        metaEl.className = "appointment-meta";
        metaEl.textContent = `${appt.date} בשעה ${appt.time}`;

        const serviceBadge = document.createElement("span");
        serviceBadge.className = "badge";
        serviceBadge.textContent = appt.serviceLabel;

        mainDiv.appendChild(nameEl);
        mainDiv.appendChild(metaEl);
        if (appt.notes) {
            const notesEl = document.createElement("div");
            notesEl.className = "appointment-meta";
            notesEl.textContent = appt.notes;
            mainDiv.appendChild(notesEl);
        }

        const actionsDiv = document.createElement("div");

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "מחק";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", () => {
            appointments.splice(index, 1);
            renderAppointments();
        });

        actionsDiv.appendChild(serviceBadge);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(mainDiv);
        li.appendChild(actionsDiv);

        appointmentsList.appendChild(li);
    });
}

function showMessage(text, type = "success") {
    formMessage.textContent = text;
    formMessage.classList.remove("success", "error");
    formMessage.classList.add(type);

    if (text) {
        setTimeout(() => {
            formMessage.textContent = "";
            formMessage.classList.remove("success", "error");
        }, 3000);
    }
}

function validatePhone(value) {
    // בדיקה בסיסית לטלפון ישראלי – מתחיל ב-05 ויש בו לפחות 9 ספרות
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("05") && digits.length >= 9;
}

appointmentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const service = document.getElementById("service").value;
    const notes = document.getElementById("notes").value.trim();

    if (!fullName || !phone || !date || !time || !service) {
        showMessage("יש למלא את כל השדות החובה", "error");
        return;
    }

    if (!validatePhone(phone)) {
        showMessage("מספר טלפון לא תקין", "error");
        return;
    }

    const serviceLabelMap = {
        haircut: "תספורת",
        beard: "עיצוב זקן",
        both: "תספורת + זקן",
        child: "תספורת ילדים",
    };

    const appt = {
        fullName,
        phone,
        date,
        time,
        service,
        serviceLabel: serviceLabelMap[service] || service,
        notes,
    };

    appointments.push(appt);
    renderAppointments();

    appointmentForm.reset();
    showMessage("התור נשמר בהצלחה", "success");
});

// רינדור ראשוני
renderAppointments();
