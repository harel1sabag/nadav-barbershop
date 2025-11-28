// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBinb32TxhzFF6t8GzDxf8e0eWIJ_qnj0o",
    authDomain: "nadav-barbershop-92308.firebaseapp.com",
    projectId: "nadav-barbershop-92308",
    storageBucket: "nadav-barbershop-92308.firebasestorage.app",
    messagingSenderId: "950654741914",
    appId: "1:950654741914:web:5ecd4a8202f759cb8f9e23"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const appointmentForm = document.getElementById("appointment-form");
const formMessage = document.getElementById("form-message");
const appointmentsList = document.getElementById("appointments-list");
const noAppointments = document.getElementById("no-appointments");
const currentYearSpan = document.getElementById("current-year");
const authStatus = document.getElementById("auth-status");
const googleSigninBtn = document.getElementById("google-signin-btn");
const authOverlay = document.getElementById("auth-overlay");
const mainContent = document.getElementById("main-content");
const userBar = document.getElementById("user-bar");
const userNameEl = document.getElementById("user-name");
const userAvatarEl = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");

// שנה נוכחית בפוטר
if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        auth
            .signOut()
            .then(() => {
                currentUser = null;
                setAuthStatusText();
            })
            .catch((error) => {
                console.error("Logout error:", error);
                showMessage("שגיאה בהתנתקות", "error");
            });
    });
}
let selectedDate = null;
let selectedTime = null;
let currentUser = null;

function formatIsoDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(isoStr) {
    const [year, month, day] = isoStr.split("-");
    return `${day}.${month}`;
}

function getHebrewDayNameShort(index) {
    const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    return days[index] || "";
}

function initializeDateSelection() {
    const container = document.getElementById("date-boxes");
    const hiddenInput = document.getElementById("selectedDate");

    if (!container || !hiddenInput) return;

    container.innerHTML = "";

    const today = new Date();

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const iso = formatIsoDate(d);
        const displayFull = formatDisplayDate(iso);
        const dayName = getHebrewDayNameShort(d.getDay());

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-box";
        btn.innerHTML = `
            <div class="date-box-day">יום ${dayName}</div>
            <div class="date-box-date">${displayFull}</div>
        `;

        if (i === 0) {
            btn.classList.add("selected");
            selectedDate = iso;
            hiddenInput.value = iso;
        }

        btn.addEventListener("click", () => {
            selectedDate = iso;
            hiddenInput.value = iso;

            const allBoxes = container.querySelectorAll(".date-box");
            allBoxes.forEach((box) => box.classList.remove("selected"));
            btn.classList.add("selected");
        });

        container.appendChild(btn);
    }
}

function initializeTimeSelection() {
    const container = document.getElementById("time-boxes");
    const hiddenInput = document.getElementById("selectedTime");

    if (!container || !hiddenInput) return;

    container.innerHTML = "";

    const slots = [
        "15:00", "15:30",
        "16:00", "16:30",
        "17:00", "17:30",
        "18:00", "18:30",
        "19:00", "19:30",
        "20:00",
    ];

    slots.forEach((time, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "time-box";
        btn.textContent = time;

        if (index === 0) {
            btn.classList.add("selected");
            selectedTime = time;
            hiddenInput.value = time;
        }

        btn.addEventListener("click", () => {
            selectedTime = time;
            hiddenInput.value = time;

            const allBoxes = container.querySelectorAll(".time-box");
            allBoxes.forEach((box) => box.classList.remove("selected"));
            btn.classList.add("selected");
        });

        container.appendChild(btn);
    });
}

let appointments = [];

function setAuthStatusText() {
    if (!authStatus) return;
    if (currentUser) {
        authStatus.textContent = `מחובר כ- ${currentUser.displayName || currentUser.email}`;
        if (authOverlay) authOverlay.classList.add("hidden");
        if (mainContent) mainContent.classList.remove("hidden");
        if (userBar) userBar.classList.remove("hidden");

        if (userNameEl) {
            userNameEl.textContent = currentUser.displayName || currentUser.email || "משתמש";
        }
        if (userAvatarEl) {
            if (currentUser.photoURL) {
                userAvatarEl.src = currentUser.photoURL;
                userAvatarEl.classList.remove("hidden");
            } else {
                userAvatarEl.classList.add("hidden");
            }
        }
    } else {
        authStatus.textContent = "לא מחובר";
        if (authOverlay) authOverlay.classList.remove("hidden");
        if (mainContent) mainContent.classList.add("hidden");
        if (userBar) userBar.classList.add("hidden");
    }
}

function saveUserToFirestore(user) {
    if (!user) return;
    const userRef = db.collection("users").doc(user.uid);
    return userRef.set(
        {
            displayName: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
    );
}

function loadAppointmentsFromFirestore() {
    return db
        .collection("appointments")
        .orderBy("date")
        .orderBy("time")
        .get()
        .then((snapshot) => {
            appointments = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    fullName: data.fullName,
                    phone: data.phone,
                    date: data.date,
                    time: data.time,
                    displayDate: formatDisplayDate(data.date),
                };
            });
            renderAppointments();
        })
        .catch((error) => {
            console.error("Error loading appointments: ", error);
            showMessage("שגיאה בטעינת התורים מהשרת", "error");
        });
}

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
        metaEl.textContent = `${appt.displayDate} בשעה ${appt.time}`;

        const serviceBadge = document.createElement("span");
        serviceBadge.className = "badge";
        serviceBadge.textContent = "תספורת";

        mainDiv.appendChild(nameEl);
        mainDiv.appendChild(metaEl);

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
    const date = document.getElementById("selectedDate").value;
    const time = document.getElementById("selectedTime").value;

    if (!fullName || !phone || !date || !time) {
        showMessage("יש למלא את כל השדות החובה", "error");
        return;
    }

    if (!currentUser) {
        showMessage("חייבים להתחבר עם Google לפני קביעת תור", "error");
        return;
    }

    if (!validatePhone(phone)) {
        showMessage("מספר טלפון לא תקין", "error");
        return;
    }

    const appt = {
        fullName,
        phone,
        date,
        time,
        userId: currentUser.uid,
        userEmail: currentUser.email || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    db.collection("appointments")
        .add(appt)
        .then(() => {
            appointments.push({
                ...appt,
                displayDate: formatDisplayDate(date),
            });
            renderAppointments();

            // איפוס טופס לברירות המחדל (ריבועי תאריכים ושעה)
            appointmentForm.reset();
            initializeDateSelection();
            initializeTimeSelection();
            showMessage("התור נשמר בהצלחה", "success");
        })
        .catch((error) => {
            console.error("Error saving appointment: ", error);
            showMessage("שגיאה בשמירת התור לשרת", "error");
        });
});

if (googleSigninBtn) {
    googleSigninBtn.addEventListener("click", () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth
            .signInWithPopup(provider)
            .then((result) => {
                currentUser = result.user;
                setAuthStatusText();
                return saveUserToFirestore(currentUser);
            })
            .catch((error) => {
                console.error("Google sign-in error:", error);
                showMessage("שגיאה בהתחברות עם Google", "error");
            });
    });
}

auth.onAuthStateChanged((user) => {
    currentUser = user || null;
    setAuthStatusText();
    if (currentUser) {
        saveUserToFirestore(currentUser);
    }
});

// אתחול בחירת תאריך (ריבועים) ושעה (ריבועים) וטעינת תורים מה-DB
initializeDateSelection();
initializeTimeSelection();
loadAppointmentsFromFirestore();
