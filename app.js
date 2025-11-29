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
const appointmentsTitle = document.getElementById("appointments-title");
const newAppointmentSection = document.getElementById("new-appointment-section");
const seedDemoBtn = document.getElementById("seed-demo-btn");
const deleteAllBtn = document.getElementById("delete-all-btn");

// שנה נוכחית בפוטר
if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
}

function startAvailabilityListener() {
    // מאזין גלובלי לכל התורים לצורך חישוב משבצות תפוסות
    if (availabilityUnsubscribe) {
        availabilityUnsubscribe();
        availabilityUnsubscribe = null;
    }

    const query = db.collection("appointments").orderBy("date").orderBy("time");

    availabilityUnsubscribe = query.onSnapshot(
        (snapshot) => {
            allAppointmentsForAvailability = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.date,
                    time: data.time,
                };
            });

            // לעדכן את משבצות השעות עבור התאריך הנבחר כעת
            initializeTimeSelection();
        },
        (error) => {
            console.error("Error loading availability (realtime): ", error);
        }
    );
}

function handleDeleteAllAppointments() {
    if (!isAdmin) {
        alert("רק אדמין יכול למחוק את כל התורים");
        return;
    }
    db.collection("appointments")
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                return;
            }

            const batch = db.batch();
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            return batch.commit();
        })
        .then(() => {
            appointments = [];
            renderAppointments();
        })
        .catch((error) => {
            console.error("Error deleting all appointments:", error);
            alert("שגיאה במחיקת כל התורים: " + (error && error.message ? error.message : ""));
        });
}

if (deleteAllBtn) {
    deleteAllBtn.onclick = handleDeleteAllAppointments;
}

if (seedDemoBtn) {
    seedDemoBtn.addEventListener("click", () => {
        if (!isAdmin) return;

        const baseDate = new Date();
        const mkDate = (offsetDays) => {
            const d = new Date(baseDate);
            d.setDate(d.getDate() + offsetDays);
            return formatIsoDate(d);
        };

        const demoAppointments = [
            {
                fullName: "בדיקה – יוסי",
                phone: "0500000001",
                date: mkDate(0),
                time: "15:00",
            },
            {
                fullName: "בדיקה – דני",
                phone: "0500000002",
                date: mkDate(1),
                time: "16:30",
            },
            {
                fullName: "בדיקה – מיכאל",
                phone: "0500000003",
                date: mkDate(2),
                time: "18:00",
            },
        ];

        const batch = db.batch();

        demoAppointments.forEach((appt) => {
            const ref = db.collection("appointments").doc();
            batch.set(ref, {
                ...appt,
                userId: "demo",
                userEmail: "demo@example.com",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
        });

        batch
            .commit()
            .then(() => {
                showMessage("תורי דמו נוצרו", "success");
                return loadAppointmentsFromFirestore();
            })
            .catch((error) => {
                console.error("Error seeding demo appointments:", error);
                showMessage("שגיאה ביצירת תורי דמו", "error");
            });
    });
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
let isAdmin = false;
let appointmentsUnsubscribe = null;
let availabilityUnsubscribe = null;
let allAppointmentsForAvailability = [];

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
            initializeTimeSelection();
        }

        btn.addEventListener("click", () => {
            selectedDate = iso;
            hiddenInput.value = iso;

            const allBoxes = container.querySelectorAll(".date-box");
            allBoxes.forEach((box) => box.classList.remove("selected"));
            btn.classList.add("selected");

            // עדכון משבצות השעות לפי התאריך החדש
            selectedTime = null;
            initializeTimeSelection();
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

    const takenTimes = new Set(
        allAppointmentsForAvailability
            .filter((a) => a.date === selectedDate)
            .map((a) => a.time)
    );

    const now = new Date();
    const todayIso = formatIsoDate(now);

    let hasSelectedDefault = false;

    slots.forEach((time) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "time-box";
        btn.dataset.time = time;

        let isTaken = takenTimes.has(time);

        // אם מדובר בתאריך של היום – שעות שעברו כלל לא יוצגו
        if (selectedDate === todayIso) {
            const [hourStr, minuteStr] = time.split(":");
            const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hourStr, 10), parseInt(minuteStr, 10));
            if (slotDate <= now) {
                return; // לא מציירים בכלל את המשבצת
            }
        }

        if (isTaken) {
            btn.classList.add("taken");
            btn.textContent = "תפוס";
        } else {
            btn.textContent = time;
        }

        if (!isTaken && !hasSelectedDefault) {
            btn.classList.add("selected");
            selectedTime = time;
            hiddenInput.value = time;
            hasSelectedDefault = true;
        }

        btn.addEventListener("click", () => {
            if (btn.classList.contains("taken")) {
                return;
            }
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
        isAdmin = currentUser.email === "sabag1715@gmail.com";
        authStatus.textContent = `מחובר כ- ${currentUser.displayName || currentUser.email}`;
        if (authOverlay) authOverlay.classList.add("hidden");
        if (mainContent) mainContent.classList.remove("hidden");
        if (userBar) userBar.classList.remove("hidden");

        if (appointmentsTitle) {
            appointmentsTitle.textContent = isAdmin ? "כל התורים (אדמין)" : "התורים שלך";
        }

        if (seedDemoBtn) {
            seedDemoBtn.classList.toggle("hidden", !isAdmin);
        }

        if (deleteAllBtn) {
            deleteAllBtn.classList.toggle("hidden", !isAdmin);
        }

        if (userNameEl) {
            const baseName = currentUser.displayName || currentUser.email || "משתמש";
            userNameEl.textContent = isAdmin ? `${baseName} (אדמין)` : baseName;
        }
        if (userAvatarEl) {
            if (currentUser.photoURL) {
                userAvatarEl.src = currentUser.photoURL;
                userAvatarEl.classList.remove("hidden");
            } else {
                userAvatarEl.classList.add("hidden");
            }
        }

        if (appointmentForm) {
            if (isAdmin) {
                appointmentForm.classList.add("disabled");
            } else {
                appointmentForm.classList.remove("disabled");
            }
        }

        if (newAppointmentSection) {
            if (isAdmin) {
                newAppointmentSection.classList.add("hidden");
            } else {
                newAppointmentSection.classList.remove("hidden");
            }
        }
    } else {
        authStatus.textContent = "לא מחובר";
        if (authOverlay) authOverlay.classList.remove("hidden");
        if (mainContent) mainContent.classList.add("hidden");
        if (userBar) userBar.classList.add("hidden");
        isAdmin = false;
        if (appointmentForm) {
            appointmentForm.classList.remove("disabled");
        }
        if (newAppointmentSection) {
            newAppointmentSection.classList.remove("hidden");
        }
        if (seedDemoBtn) {
            seedDemoBtn.classList.add("hidden");
        }
        if (deleteAllBtn) {
            deleteAllBtn.classList.add("hidden");
        }
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
    // נבטל מאזין קודם אם קיים (למקרה של החלפת משתמש)
    if (appointmentsUnsubscribe) {
        appointmentsUnsubscribe();
        appointmentsUnsubscribe = null;
    }

    if (!currentUser) {
        appointments = [];
        renderAppointments();
        return;
    }

    let query = db.collection("appointments");

    if (!isAdmin) {
        query = query.where("userId", "==", currentUser.uid);
    }

    query = query.orderBy("date").orderBy("time");

    appointmentsUnsubscribe = query.onSnapshot(
        (snapshot) => {
            appointments = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    fullName: data.fullName,
                    phone: data.phone,
                    date: data.date,
                    time: data.time,
                    displayDate: formatDisplayDate(data.date),
                    userId: data.userId,
                };
            });
            renderAppointments();
        },
        (error) => {
            console.error("Error loading appointments (realtime): ", error);
            showMessage("שגיאה בטעינת התורים מהשרת", "error");
        }
    );
}

function renderAppointments() {
    if (!appointmentsList) return;

    const visibleAppointments = isAdmin
        ? appointments
        : appointments.filter((appt) => appt.userId === (currentUser && currentUser.uid));

    if (visibleAppointments.length === 0) {
        if (noAppointments) noAppointments.style.display = "block";
        const tbodyEmpty = appointmentsList.tBodies && appointmentsList.tBodies[0];
        if (tbodyEmpty) tbodyEmpty.innerHTML = "";
        return;
    }

    if (noAppointments) noAppointments.style.display = "none";

    const tbody = appointmentsList.tBodies[0] || appointmentsList.createTBody();
    tbody.innerHTML = "";

    visibleAppointments.forEach((appt, index) => {
        const tr = document.createElement("tr");

        const dateTd = document.createElement("td");
        dateTd.textContent = appt.displayDate;

        const timeTd = document.createElement("td");
        timeTd.textContent = appt.time;

        const nameTd = document.createElement("td");
        nameTd.textContent = appt.fullName;

        const phoneTd = document.createElement("td");
        phoneTd.textContent = appt.phone;

        const actionsTd = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "מחק";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", () => {
            // למשתמש רגיל נבקש אישור, אדמין מוחק מיד
            if (!isAdmin) {
                const ok = confirm("האם אתה בטוח שברצונך למחוק את התור?");
                if (!ok) return;
            }

            const apptId = appt.id;
            if (apptId) {
                db.collection("appointments")
                    .doc(apptId)
                    .delete()
                    .then(() => {
                        appointments = appointments.filter((a) => a.id !== apptId);
                        renderAppointments();
                        showMessage("התור נמחק בהצלחה", "success");
                    })
                    .catch((error) => {
                        console.error("Error removing document: ", error);
                        showMessage("שגיאה במחיקת התור", "error");
                    });
            } else {
                appointments = appointments.filter((_, i) => i !== index);
                renderAppointments();
            }
        });

        actionsTd.appendChild(deleteBtn);

        tr.appendChild(dateTd);
        tr.appendChild(timeTd);
        tr.appendChild(nameTd);
        tr.appendChild(phoneTd);
        tr.appendChild(actionsTd);

        tbody.appendChild(tr);
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

    if (isAdmin) {
        showMessage("אדמין לא יכול לקבוע תורים – רק לצפות ולנהל", "error");
        return;
    }

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
        loadAppointmentsFromFirestore();
        startAvailabilityListener();
    } else {
        if (appointmentsUnsubscribe) {
            appointmentsUnsubscribe();
            appointmentsUnsubscribe = null;
        }
        if (availabilityUnsubscribe) {
            availabilityUnsubscribe();
            availabilityUnsubscribe = null;
        }
        appointments = [];
        renderAppointments();
    }
});

// אתחול בחירת תאריך (ריבועים) ושעה (ריבועים)
initializeDateSelection();
initializeTimeSelection();
