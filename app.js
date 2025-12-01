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
const appointmentsCompletedList = document.getElementById("appointments-completed-list");
const completedAppointmentsTitle = document.getElementById("completed-appointments-title");
const adminWorkSettingsEl = document.getElementById("admin-work-settings");
const adminWorkGridEl = document.getElementById("admin-work-grid");
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
const adminSettingsLink = document.getElementById("admin-settings-link");
const userSingleAppointment = document.getElementById("user-single-appointment");
const userHistoryEl = document.getElementById("user-history");
const confirmDialog = document.getElementById("confirm-dialog");
const confirmMessageEl = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
const noAvailabilityMessage = document.getElementById("no-availability-message");
const noTimesMessage = document.getElementById("no-times-message");
const adminWorkCloseAllBtn = document.getElementById("admin-work-close-all");
const adminWorkOpenAllBtn = document.getElementById("admin-work-open-all");

// שנה נוכחית בפוטר
if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
}

// כפתורי "סגור הכל" / "פתח הכל" בעמוד הגדרות העבודה
if (adminWorkCloseAllBtn) {
    adminWorkCloseAllBtn.addEventListener("click", () => {
        const baseSlots = buildTimeSlotsFromSettings();
        workSettings.workSlots = {};
        for (let d = 0; d < 7; d++) {
            const key = String(d);
            workSettings.workSlots[key] = [];
            workSettings.workDays[d] = false;
        }
        renderWorkSettingsGrid();
        saveWorkSettingsToFirestore(true).then(() => {
            initializeDateSelection(true);
        });
    });
}

if (adminWorkOpenAllBtn) {
    adminWorkOpenAllBtn.addEventListener("click", () => {
        const baseSlots = buildTimeSlotsFromSettings();
        workSettings.workSlots = {};
        for (let d = 0; d < 7; d++) {
            const key = String(d);
            workSettings.workSlots[key] = baseSlots.slice();
            workSettings.workDays[d] = true;
        }
        renderWorkSettingsGrid();
        saveWorkSettingsToFirestore(true).then(() => {
            initializeDateSelection(true);
        });
    });
}

// בניית טבלת השעות לאדמין (ימים × שעות)
function renderWorkSettingsGrid() {
    if (!adminWorkGridEl) return;

    const baseSlots = buildTimeSlotsFromSettings();
    if (!workSettings.workSlots || Object.keys(workSettings.workSlots).length === 0) {
        workSettings.workSlots = {};
        for (let d = 0; d < 7; d++) {
            const key = String(d);
            workSettings.workSlots[key] = baseSlots.slice();
        }
    }

    const dayNames = [
        "יום ראשון",
        "יום שני",
        "יום שלישי",
        "יום רביעי",
        "יום חמישי",
        "יום שישי",
        "יום שבת",
    ];

    const table = document.createElement("table");
    table.className = "work-grid-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    // תא ריק בתחילת השורה עבור כפתור "כל השעה" בכל שורה
    const emptyTh = document.createElement("th");
    emptyTh.textContent = "";
    headRow.appendChild(emptyTh);
    dayNames.forEach((name, dayIndex) => {
        const th = document.createElement("th");
        th.textContent = name;

        // לחיצה על שם היום – הדלקה/כיבוי של כל השעות ביום הזה
        th.style.cursor = "pointer";
        th.addEventListener("click", () => {
            const key = String(dayIndex);
            const currentSlots = workSettings.workSlots[key] || baseSlots;
            const hasAny = currentSlots.length > 0;

            // אם יש שעות פעילות – נכבה את כל היום, אחרת נדליק את כל המשבצות
            workSettings.workSlots[key] = hasAny ? [] : baseSlots.slice();
            workSettings.workDays[dayIndex] = !hasAny;

            // בנייה מחדש של הגריד כדי לשקף את המצב החדש
            renderWorkSettingsGrid();
            // שמירה אוטומטית וריענון התאריכים/שעות למשתמשים
            saveWorkSettingsToFirestore(false).then(() => {
                initializeDateSelection();
                initializeTimeSelection();
            });
        });

        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const daySlotCounts = new Array(7).fill(0);

    baseSlots.forEach((time) => {
        const row = document.createElement("tr");

        // תא שליטה לכל שורה – כיבוי/הדלקה של כל הימים בשעה הזו
        const controlTd = document.createElement("td");
        const controlBtn = document.createElement("button");
        controlBtn.type = "button";
        controlBtn.className = "secondary-btn";
        controlBtn.textContent = time;
        controlBtn.addEventListener("click", () => {
            let anyOn = false;
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const key = String(dayIndex);
                const arr = workSettings.workSlots[key] || [];
                if (arr.includes(time)) {
                    anyOn = true;
                    break;
                }
            }

            // אם יש לפחות יום אחד פעיל בשעה הזו – נכבה בכל הימים, אחרת נדליק בכולם
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                const key = String(dayIndex);
                let arr = workSettings.workSlots[key] || [];
                if (anyOn) {
                    arr = arr.filter((t) => t !== time);
                } else {
                    if (!arr.includes(time)) arr.push(time);
                }
                workSettings.workSlots[key] = arr;

                const base = buildTimeSlotsFromSettings();
                const slotsForDay = workSettings.workSlots[key] || base;
                workSettings.workDays[dayIndex] = slotsForDay.length > 0;
            }

            renderWorkSettingsGrid();
            saveWorkSettingsToFirestore(false).then(() => {
                initializeDateSelection();
                initializeTimeSelection();
            });
        });
        controlTd.appendChild(controlBtn);
        row.appendChild(controlTd);

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const key = String(dayIndex);
            const allowedSlots = workSettings.workSlots[key] || baseSlots;
            const isActive = allowedSlots.includes(time);

            if (isActive) {
                daySlotCounts[dayIndex] += 1;
            }

            const td = document.createElement("td");
            const span = document.createElement("span");
            span.textContent = time;
            span.className = "work-slot " + (isActive ? "work-slot-active" : "work-slot-disabled");

            span.addEventListener("click", () => {
                const arr = workSettings.workSlots[key] || [];
                const idx = arr.indexOf(time);
                if (idx === -1) {
                    arr.push(time);
                } else {
                    arr.splice(idx, 1);
                }
                workSettings.workSlots[key] = arr;

                // לעדכן גם את workDays: יום פעיל אם יש בו לפחות שעה אחת פעילה
                const base = buildTimeSlotsFromSettings();
                const slotsForDay = workSettings.workSlots[key] || base;
                workSettings.workDays[dayIndex] = slotsForDay.length > 0;

                // רינדור מחדש של כל הגריד כדי לעדכן גם את שורת הסיכום
                renderWorkSettingsGrid();

                // שמירה אוטומטית של ההגדרות בכל שינוי
                saveWorkSettingsToFirestore(false);
            });

            td.appendChild(span);
            row.appendChild(td);
        }

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // שורת סיכום בתחתית הטבלה – כמה משבצות פעילות בכל יום
    const tfoot = document.createElement("tfoot");
    const summaryRow = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.textContent = "סה\"כ תורים";
    labelTd.className = "work-grid-summary-label";
    summaryRow.appendChild(labelTd);

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const td = document.createElement("td");
        td.textContent = daySlotCounts[dayIndex];
        td.className = "work-grid-summary-cell";
        summaryRow.appendChild(td);
    }

    tfoot.appendChild(summaryRow);
    table.appendChild(tfoot);

    adminWorkGridEl.innerHTML = "";
    adminWorkGridEl.appendChild(table);
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
                    status: data.status || null,
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
        alert("רק אדמין יכול לבטל את כל התורים");
        return;
    }
    openConfirm("האם אתה בטוח שברצונך לבטל את כל התורים שלא בוצעו?", () => {
        db.collection("appointments")
            .get()
            .then((snapshot) => {
                if (snapshot.empty) {
                    return;
                }

                const batch = db.batch();

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    // משאירים תורים שבוצעו (status === "completed"), מוחקים רק תורים שלא בוצעו
                    if (data && data.status === "completed") {
                        return;
                    }
                    batch.delete(doc.ref);
                });

                return batch.commit();
            })
            .then(() => {
                // נטען מחדש את התורים כדי לעדכן את שתי הטבלאות
                loadAppointmentsFromFirestore();
            })
            .catch((error) => {
                console.error("Error deleting all appointments:", error);
                alert("שגיאה בביטול כל התורים: " + (error && error.message ? error.message : ""));
            });
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
let workSettingsUnsubscribe = null;
let allAppointmentsForAvailability = [];
let pendingConfirmAction = null;

// הגדרות ברירת מחדל לימים ושעות עבודה (ניתן לעדכן ע"י אדמין)
let workSettings = {
    // workDays: מערך באורך 7 (0=ראשון ... 6=שבת)
    workDays: [true, true, true, true, true, false, false],
    // שעות בסיס (אותן שעות לכל הימים, חצאי שעה)
    startTime: "15:00",
    endTime: "20:00",
    // workSlots: לכל יום רשימת שעות מותרות. אם חסר, כל השעות מותרות.
    workSlots: {},
};

// מאזין בזמן אמת להגדרות ימי ושעות עבודה (מסמך settings/work)
function startWorkSettingsListener() {
    if (workSettingsUnsubscribe) {
        workSettingsUnsubscribe();
        workSettingsUnsubscribe = null;
    }

    const ref = db.collection("settings").doc("work");
    const baseSlots = buildTimeSlotsFromSettings();

    workSettingsUnsubscribe = ref.onSnapshot(
        (doc) => {
            if (doc.exists) {
                const data = doc.data() || {};

                if (typeof data.startTime === "string") {
                    workSettings.startTime = data.startTime;
                }
                if (typeof data.endTime === "string") {
                    workSettings.endTime = data.endTime;
                }

                // workSlots: לכל יום רשימת שעות מותרות. אם חסר – כל השעות מותרות.
                if (data.workSlots && typeof data.workSlots === "object") {
                    workSettings.workSlots = {};
                    for (let d = 0; d < 7; d++) {
                        const key = String(d);
                        const arr = Array.isArray(data.workSlots[key])
                            ? data.workSlots[key].filter((t) => baseSlots.includes(t))
                            : baseSlots.slice();
                        workSettings.workSlots[key] = arr;
                    }
                }

                // workDays: אם קיים בשמירה – ניקח אותו, אחרת נגזור לפי workSlots
                if (Array.isArray(data.workDays) && data.workDays.length === 7) {
                    workSettings.workDays = data.workDays.map((v, i) => !!data.workDays[i]);
                } else {
                    const derivedDays = [];
                    for (let d = 0; d < 7; d++) {
                        const key = String(d);
                        const slotsForDay = workSettings.workSlots[key] || baseSlots;
                        derivedDays[d] = slotsForDay.length > 0;
                    }
                    workSettings.workDays = derivedDays;
                }
            } else {
                // אין מסמך – ברירת מחדל: כל השעות מותרות לכל יום ראשון-חמישי
                workSettings.workSlots = {};
                for (let d = 0; d < 7; d++) {
                    const key = String(d);
                    workSettings.workSlots[key] = baseSlots.slice();
                }
            }

            // עדכון הגריד בעמוד ההגדרות (אם קיים) ובחירת תאריכים/שעות בעמוד התורים
            renderWorkSettingsGrid();
            // שומרים את היום הנבחר אם עדיין מותר לפי ההגדרות
            initializeDateSelection(true);

            // כל שינוי בהגדרות – נוודא שההודעה הגלובלית תוסתר כברירת מחדל;
            // אם אכן אין ימים זמינים, initializeDateSelection תציג אותה שוב.
            if (noAvailabilityMessage) {
                noAvailabilityMessage.classList.add("hidden");
            }
        },
        (error) => {
            console.error("Error listening to work settings:", error);
        }
    );
}

// שמירת workSettings ל-Firestore (משותפת לכפתור וללחיצה על משבצת)
function saveWorkSettingsToFirestore(showMessages = true) {
    const ref = db.collection("settings").doc("work");
    return ref
        .set(workSettings, { merge: true })
        .then(() => {
            if (showMessages) {
                showMessage("הגדרות ימי ושעות העבודה נשמרו", "success");
            }
        })
        .catch((error) => {
            console.error("Error saving work settings:", error);
            if (showMessages) {
                showMessage("שגיאה בשמירת הגדרות ימי ושעות עבודה", "error");
            }
        });
}

function openConfirm(message, onConfirm) {
    if (!confirmDialog || !confirmMessageEl || !confirmOkBtn || !confirmCancelBtn) {
        // fallback אם משום מה הדיאלוג לא קיים
        if (window.confirm(message)) {
            onConfirm();
        }
        return;
    }

    confirmMessageEl.textContent = message;
    pendingConfirmAction = onConfirm;
    confirmDialog.classList.remove("hidden");

    const handleOk = () => {
        confirmDialog.classList.add("hidden");
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        const action = pendingConfirmAction;
        pendingConfirmAction = null;
        if (action) action();
    };

    const handleCancel = () => {
        confirmDialog.classList.add("hidden");
        confirmOkBtn.removeEventListener("click", handleOk);
        confirmCancelBtn.removeEventListener("click", handleCancel);
        pendingConfirmAction = null;
    };

    confirmOkBtn.addEventListener("click", handleOk);
    confirmCancelBtn.addEventListener("click", handleCancel);
}

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

// בניית משבצות זמן קבועות (חצאי שעות) בין 11:00 ל-20:00
function buildTimeSlotsFromSettings() {
    return [
        "11:00", "11:30",
        "12:00", "12:30",
        "13:00", "13:30",
        "14:00", "14:30",
        "15:00", "15:30",
        "16:00", "16:30",
        "17:00", "17:30",
        "18:00", "18:30",
        "19:00", "19:30",
        "20:00",
    ];
}

function appointmentToDate(appt) {
    // appt.date בפורמט YYYY-MM-DD, appt.time בפורמט HH:MM
    const [yearStr, monthStr, dayStr] = appt.date.split("-");
    const [hourStr, minuteStr] = (appt.time || "00:00").split(":");
    return new Date(
        parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        parseInt(dayStr, 10),
        parseInt(hourStr, 10),
        parseInt(minuteStr, 10)
    );
}

function formatTimeDiff(fromDate, toDate) {
    const diffMs = toDate - fromDate;
    if (diffMs < 0) return "בעתיד";

    const totalMinutes = Math.floor(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0 && hours > 0) {
        return `לפני ${days} ימים ו-${hours} שעות`;
    }
    if (days > 0) {
        return days === 1 ? "לפני יום" : `לפני ${days} ימים`;
    }
    if (hours > 0) {
        return hours === 1 ? "לפני שעה" : `לפני ${hours} שעות`;
    }
    return "לפני פחות משעה";
}

function initializeDateSelection(keepCurrentSelected = false) {
    const container = document.getElementById("date-boxes");
    const hiddenInput = document.getElementById("selectedDate");

    if (!container || !hiddenInput) return;

    container.innerHTML = "";

    const today = new Date();

    // נשמור את התאריך הנוכחי אם רוצים לשמור בחירה קיימת
    const previousSelected = keepCurrentSelected ? selectedDate : null;

    // נציג עד 7 ימים קרובים שהם ימי עבודה לפי ההגדרות
    let created = 0;
    let offset = 0;
    while (created < 7 && offset < 30) {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);

        const dayIndex = d.getDay();
        const isWorkDay = !!workSettings.workDays[dayIndex];
        offset++;
        if (!isWorkDay) {
            continue;
        }

        const iso = formatIsoDate(d);
        const displayFull = formatDisplayDate(iso);
        const dayName = getHebrewDayNameShort(dayIndex);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "date-box";
        btn.dataset.date = iso;
        btn.innerHTML = `
            <div class="date-box-day">יום ${dayName}</div>
            <div class="date-box-date">${displayFull}</div>
        `;

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
        created++;
    }

    // אחרי שבנינו את כל הכפתורים – נחליט איזה יום מסומן
    const allBoxes = container.querySelectorAll(".date-box");
    if (allBoxes.length === 0) {
        selectedDate = null;
        hiddenInput.value = "";
        initializeTimeSelection();

        // אין כלל ימים זמינים בשבוע הקרוב – מסתירים את הטופס ומציגים הודעה
        if (newAppointmentSection) {
            newAppointmentSection.classList.add("hidden");
        }
        if (noAvailabilityMessage) {
            noAvailabilityMessage.classList.remove("hidden");
        }
        return;
    }

    let targetIso = null;
    if (previousSelected) {
        const exists = Array.from(allBoxes).some((el) => el.dataset.date === previousSelected);
        if (exists) {
            targetIso = previousSelected;
        }
    }

    if (!targetIso) {
        targetIso = allBoxes[0].dataset.date;
    }

    selectedDate = targetIso;
    hiddenInput.value = targetIso;
    allBoxes.forEach((el) => {
        el.classList.toggle("selected", el.dataset.date === targetIso);
    });
    initializeTimeSelection();

    // יש לפחות יום אחד זמין – נוודא שהודעת "אין שעות עבודה פתוחות" מוסתרת
    if (noAvailabilityMessage) {
        noAvailabilityMessage.classList.add("hidden");
    }
    if (newAppointmentSection && !isAdmin) {
        newAppointmentSection.classList.remove("hidden");
    }
}

function initializeTimeSelection() {
    const container = document.getElementById("time-boxes");
    const hiddenInput = document.getElementById("selectedTime");

    if (!container || !hiddenInput) return;

    container.innerHTML = "";
    // איפוס בחירת שעה קודמת – המשתמש חייב לבחור שעה באופן מפורש
    hiddenInput.value = "";
    selectedTime = null;

    const baseSlots = buildTimeSlotsFromSettings();

    // סינון השעות לפי היום והתצורה שהגדיר האדמין
    let slotsForDay = baseSlots;
    if (selectedDate) {
        const d = new Date(selectedDate);
        const dayIndex = d.getDay();
        const key = String(dayIndex);
        if (workSettings.workSlots && Array.isArray(workSettings.workSlots[key])) {
            const allowed = workSettings.workSlots[key];
            slotsForDay = baseSlots.filter((t) => allowed.includes(t));
        }
    }

    const slots = slotsForDay;

    if (!slots || slots.length === 0) {
        // אין שעות זמינות ליום שנבחר – מציגים הודעה ומסתירים משבצות
        if (noTimesMessage) {
            noTimesMessage.classList.remove("hidden");
        }
        return;
    }

    if (noTimesMessage) {
        noTimesMessage.classList.add("hidden");
    }
    const takenTimes = new Set(
        allAppointmentsForAvailability
            .filter((a) => a.date === selectedDate && a.status !== "completed")
            .map((a) => a.time)
    );

    const now = new Date();
    const todayIso = formatIsoDate(now);

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
            appointmentsTitle.textContent = isAdmin ? "כל התורים (אדמין)" : "התור שלך";
        }

        if (seedDemoBtn) {
            seedDemoBtn.classList.toggle("hidden", !isAdmin);
        }

        if (deleteAllBtn) {
            deleteAllBtn.classList.toggle("hidden", !isAdmin);
        }

        if (adminSettingsLink) {
            adminSettingsLink.classList.toggle("hidden", !isAdmin);
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
        if (adminSettingsLink) {
            adminSettingsLink.classList.add("hidden");
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
            const now = new Date();

            // עדכון סטטוס בתורים שעבר זמנם (30 דקות אחרי תחילת התור) ל"completed" (בוצע)
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (!data || !data.date || !data.time) return;

                const startDate = appointmentToDate({ date: data.date, time: data.time });
                const endDate = new Date(startDate.getTime() + 30 * 60000); // חצי שעה אחרי תחילת התור
                if (endDate < now && data.status !== "completed") {
                    doc.ref.update({ status: "completed" }).catch((error) => {
                        console.error("Error updating appointment status:", error);
                    });
                }
            });

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
                    status: data.status || null,
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
        : // למשתמש רגיל מציגים רק תורים שלא סומנו כ"בוצע"
          appointments.filter(
              (appt) =>
                  appt.userId === (currentUser && currentUser.uid) &&
                  appt.status !== "completed"
          );

    // למשתמש רגיל: אם יש כבר תור אחד לפחות – להסתיר את סקשן "קבע תור חדש"
    if (!isAdmin && newAppointmentSection) {
        if (currentUser && visibleAppointments.length > 0) {
            newAppointmentSection.classList.add("hidden");
        } else {
            newAppointmentSection.classList.remove("hidden");
        }
    }

    // תצוגה שונה למשתמש רגיל: כרטיס יחיד במקום טבלה
    if (!isAdmin && currentUser) {
        if (visibleAppointments.length === 0) {
            if (noAppointments) noAppointments.style.display = "block";
            if (userSingleAppointment) {
                userSingleAppointment.classList.add("hidden");
                userSingleAppointment.innerHTML = "";
            }
            const tbodyEmpty = appointmentsList.tBodies && appointmentsList.tBodies[0];
            if (tbodyEmpty) tbodyEmpty.innerHTML = "";
            appointmentsList.style.display = "none";

            // בלי תור פעיל, היסטוריה עדיין יכולה להופיע
            if (userHistoryEl) {
                renderUserHistory();
            }
            return;
        }

        if (noAppointments) noAppointments.style.display = "none";
        appointmentsList.style.display = "none";

        const appt = visibleAppointments[0];

        // חישוב שם היום לפי התאריך של התור
        const [yearStr, monthStr, dayStr] = appt.date.split("-");
        const apptDateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
        const apptDayName = getHebrewDayNameShort(apptDateObj.getDay());

        if (userSingleAppointment) {
            userSingleAppointment.classList.remove("hidden");
            userSingleAppointment.innerHTML = `
                <div class="single-appointment-main">
                    <strong>התור שלך ליום ${apptDayName} ${appt.displayDate} בשעה ${appt.time}</strong>
                    <div class="single-appointment-meta">שם: ${appt.fullName} · טלפון: ${appt.phone}</div>
                </div>
                <button type="button" class="delete-btn" id="cancel-single-appointment-btn">בטל תור</button>
            `;

            const cancelBtn = document.getElementById("cancel-single-appointment-btn");
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    openConfirm("האם אתה בטוח שברצונך לבטל את התור?", () => {
                        const apptId = appt.id;
                        if (apptId) {
                            db.collection("appointments")
                                .doc(apptId)
                                .delete()
                                .then(() => {
                                    appointments = appointments.filter((a) => a.id !== apptId);
                                    renderAppointments();
                                    showMessage("התור בוטל בהצלחה", "success");
                                })
                                .catch((error) => {
                                    console.error("Error removing document: ", error);
                                    showMessage("שגיאה בביטול התור", "error");
                                });
                        }
                    });
                };
            }
        }

        // היסטוריית תורים קודמים
        if (userHistoryEl) {
            renderUserHistory(appt);
        }

        return;
    }

    // תצוגת אדמין (טבלה מלאה)
    if (userSingleAppointment) {
        userSingleAppointment.classList.add("hidden");
        userSingleAppointment.innerHTML = "";
    }
    if (userHistoryEl) {
        userHistoryEl.classList.add("hidden");
        userHistoryEl.innerHTML = "";
    }
    appointmentsList.style.display = "table";

    const activeAppointments = appointments.filter((a) => a.status !== "completed");
    const completedAppointments = appointments.filter((a) => a.status === "completed");

    if (activeAppointments.length === 0) {
        if (noAppointments) noAppointments.style.display = "block";
    } else {
        if (noAppointments) noAppointments.style.display = "none";
    }

    const tbody = appointmentsList.tBodies[0] || appointmentsList.createTBody();
    tbody.innerHTML = "";

    activeAppointments.forEach((appt, index) => {
        const tr = document.createElement("tr");

        const nameTd = document.createElement("td");
        nameTd.textContent = appt.fullName;

        const dateTd = document.createElement("td");
        dateTd.textContent = appt.displayDate;

        const timeTd = document.createElement("td");
        timeTd.textContent = appt.time;

        const phoneTd = document.createElement("td");
        phoneTd.textContent = appt.phone;

        const actionsTd = document.createElement("td");

        // כפתור ביטול תור
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "ביטול";
        deleteBtn.className = "delete-btn";
        deleteBtn.addEventListener("click", () => {
            const apptId = appt.id;

            const performCancel = () => {
                if (apptId) {
                    db.collection("appointments")
                        .doc(apptId)
                        .delete()
                        .then(() => {
                            appointments = appointments.filter((a) => a.id !== apptId);
                            renderAppointments();
                            showMessage("התור בוטל בהצלחה", "success");
                        })
                        .catch((error) => {
                            console.error("Error removing document: ", error);
                            showMessage("שגיאה בביטול התור", "error");
                        });
                } else {
                    appointments = appointments.filter((_, i) => i !== index);
                    renderAppointments();
                }
            };

            // אדמין מבטל מיד, משתמש רגיל צריך אישור בדיאלוג
            if (isAdmin) {
                performCancel();
            } else {
                openConfirm("האם אתה בטוח שברצונך לבטל את התור?", performCancel);
            }
        });

        actionsTd.appendChild(deleteBtn);

        // כפתור "בוצע" לאדמין בלבד – סימון תור כבוצע
        if (isAdmin) {
            const completeBtn = document.createElement("button");
            completeBtn.type = "button";
            completeBtn.textContent = appt.status === "completed" ? "בוצע" : "סמן כבוצע";
            completeBtn.className = "secondary-btn";

            if (appt.status === "completed") {
                completeBtn.disabled = true;
            } else {
                completeBtn.addEventListener("click", () => {
                    const apptId = appt.id;
                    if (!apptId) return;

                    db.collection("appointments")
                        .doc(apptId)
                        .update({ status: "completed" })
                        .then(() => {
                            appointments = appointments.map((a) =>
                                a.id === apptId ? { ...a, status: "completed" } : a
                            );
                            renderAppointments();
                            showMessage("התור סומן כבוצע", "success");
                        })
                        .catch((error) => {
                            console.error("Error marking appointment as completed:", error);
                            showMessage("שגיאה בסימון התור כבוצע", "error");
                        });
                });
            }

            actionsTd.appendChild(completeBtn);
        }

        tr.appendChild(nameTd);
        tr.appendChild(dateTd);
        tr.appendChild(timeTd);
        tr.appendChild(phoneTd);
        tr.appendChild(actionsTd);

        tbody.appendChild(tr);
    });

    // רינדור טבלת התורים שבוצעו (אדמין בלבד)
    if (appointmentsCompletedList && completedAppointmentsTitle) {
        const completedTbody = appointmentsCompletedList.tBodies[0] || appointmentsCompletedList.createTBody();
        completedTbody.innerHTML = "";

        if (completedAppointments.length === 0) {
            appointmentsCompletedList.style.display = "none";
            completedAppointmentsTitle.style.display = "none";
        } else {
            appointmentsCompletedList.style.display = "table";
            completedAppointmentsTitle.style.display = "block";

            completedAppointments.forEach((appt) => {
                const tr = document.createElement("tr");

                const nameTd = document.createElement("td");
                nameTd.textContent = appt.fullName;

                const dateTd = document.createElement("td");
                dateTd.textContent = appt.displayDate;

                const timeTd = document.createElement("td");
                timeTd.textContent = appt.time;

                const phoneTd = document.createElement("td");
                phoneTd.textContent = appt.phone;

                const actionsTd = document.createElement("td");

                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.textContent = "מחק";
                deleteBtn.className = "delete-btn";
                deleteBtn.addEventListener("click", () => {
                    const apptId = appt.id;
                    if (!apptId) return;

                    db.collection("appointments")
                        .doc(apptId)
                        .delete()
                        .then(() => {
                            appointments = appointments.filter((a) => a.id !== apptId);
                            renderAppointments();
                            showMessage("התור בוטל בהצלחה", "success");
                        })
                        .catch((error) => {
                            console.error("Error removing document: ", error);
                            showMessage("שגיאה בביטול התור", "error");
                        });
                });

                actionsTd.appendChild(deleteBtn);

                tr.appendChild(nameTd);
                tr.appendChild(dateTd);
                tr.appendChild(timeTd);
                tr.appendChild(phoneTd);
                tr.appendChild(actionsTd);

                completedTbody.appendChild(tr);
            });
        }
    }
}

function renderUserHistory(currentActiveAppt = null) {
    if (!userHistoryEl || !currentUser) return;

    const now = new Date();

    const pastAppointments = appointments
        .filter((a) => a.userId === currentUser.uid)
        // משתמשים בסטטוס: רק תורים שסומנו כ"completed" נחשבים היסטוריה
        .filter((a) => a.status === "completed")
        .sort((a, b) => appointmentToDate(b) - appointmentToDate(a));

    const lastThree = pastAppointments.slice(0, 3);

    if (lastThree.length === 0) {
        userHistoryEl.classList.add("hidden");
        userHistoryEl.innerHTML = "";
        return;
    }

    userHistoryEl.classList.remove("hidden");

    const itemsHtml = lastThree
        .map((a) => {
            const d = appointmentToDate(a);
            const diffText = formatTimeDiff(d, now);
            const dateText = formatDisplayDate(a.date);
            return `<li>${dateText} בשעה ${a.time} – ${diffText}</li>`;
        })
        .join("");

    userHistoryEl.innerHTML = `
        <div class="history-title">תורים קודמים שלך</div>
        <ul class="history-list">
            ${itemsHtml}
        </ul>
    `;
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

if (appointmentForm) {
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

    // ולידציה מפורטת לכל שדה
    if (!fullName) {
        showMessage("יש למלא שם מלא", "error");
        return;
    }

    if (!phone) {
        showMessage("יש למלא מספר טלפון", "error");
        return;
    }

    if (!date) {
        showMessage("יש לבחור תאריך לתור", "error");
        return;
    }

    if (!time) {
        showMessage("יש לבחור שעה לתור", "error");
        return;
    }

    if (!currentUser) {
        showMessage("חייבים להתחבר עם Google לפני קביעת תור", "error");
        return;
    }

    // הגבלה: לכל משתמש רגיל מותר רק תור אחד במערכת
    if (!isAdmin) {
        const userHasAppointment = appointments.some(
            (a) => a.userId === currentUser.uid && a.status !== "completed"
        );
        if (userHasAppointment) {
            showMessage("יש לך כבר תור אחד במערכת. כדי לקבוע תור חדש, בטל קודם את התור הקיים.", "error");
            return;
        }
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
        status: "scheduled",
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
}

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
        // מאזינים בזמן אמת להגדרות ימי ושעות עבודה, ואז טוענים את התורים והזמינות
        startWorkSettingsListener();
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
        if (workSettingsUnsubscribe) {
            workSettingsUnsubscribe();
            workSettingsUnsubscribe = null;
        }
        appointments = [];
        renderAppointments();
    }
});

// אתחול בחירת תאריך (ריבועים) ושעה (ריבועים)
initializeDateSelection();
initializeTimeSelection();
