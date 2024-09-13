let scheduleData = {};
let teacherClasses = {};
let absentTeachers = [];
let availableTeachers = [];
let replacementTeachers = [];
let provisionalAssignments = {}; // Track which teacher is assigned at each time slot

// Fetch the schedule data
function fetchScheduleData() {
  fetch("/final.json")
    .then((response) => response.json())
    .then((data) => {
      scheduleData = data.schedule;
      generateTeacherClasses();
      loadAvailableTeachers();
    })
    .catch((error) => console.error("Error fetching schedule data:", error));
}

// Generate the number of classes each teacher has
function generateTeacherClasses() {
  teacherClasses = {};
  Object.values(scheduleData).forEach((entries) => {
    entries.forEach((entry) => {
      if (!teacherClasses[entry.teacher]) {
        teacherClasses[entry.teacher] = 0;
      }
      teacherClasses[entry.teacher]++;
    });
  });
}

// Load available teachers
function loadAvailableTeachers() {
  availableTeachers = new Set();
  Object.values(scheduleData).forEach((entries) => {
    entries.forEach((entry) => {
      availableTeachers.add(entry.teacher);
    });
  });
  availableTeachers = Array.from(availableTeachers);
}

window.onload = fetchScheduleData;

// Load the schedule for the selected day
function loadSchedule() {
  const day = document.getElementById("daySelect").value;

  if (day) {
    absentTeachers = [];
    document.getElementById("teacherSelectionSection").style.display = "block";

    if (scheduleData[day]) {
      populateTeacherList();

      // Show absent teachers as an alert after teacher list is populated
      setTimeout(() => {
        // alert(`Select Absent Teachers for ${day}. ${absentTeachers.join(', ')}`);
      }, 100);
    } else {
      document.getElementById("teacherList").innerHTML =
        "<p>No schedule available for the selected day</p>";
    }
  } else {
    document.getElementById("teacherSelectionSection").style.display = "none";
  }
}
// Function to count the number of classes a teacher has on a specific day
function countClassesForTeacher(teacher, day) {
  return scheduleData[day].filter((entry) => entry.teacher === teacher).length;
}

// Populate the teacher checkbox list
function populateTeacherList() {
  const teacherList = document.getElementById("teacherList");
  teacherList.innerHTML = ""; // Clear previous data

  if (availableTeachers.length > 0) {
    availableTeachers.forEach((teacher) => {
      const classCount = countClassesForTeacher(
        teacher,
        document.getElementById("daySelect").value
      );
      let checkbox = `<div>
        <input type="checkbox" id="teacher-${teacher}" value="${teacher}" onchange="updateAbsentTeachers()">
        <label for="teacher-${teacher}" style="padding-left:5px;">
          ${teacher} <strong style="color:Orange;">(${classCount})</strong>
        </label>
      </div>`;
      teacherList.innerHTML += checkbox;
    });
  } else {
    teacherList.innerHTML = "<p>No teachers available</p>";
  }
}

// Update the list of absent teachers based on selected checkboxes
function updateAbsentTeachers() {
  absentTeachers = Array.from(
    document.querySelectorAll("#teacherList input:checked")
  ).map((input) => input.value);
}

// Generate provisional routine based on available teachers
// Generate provisional routine based on available teachers
// Helper function to count consecutive classes for a teacher
function countConsecutiveClasses(teacher, day) {
  let teacherClasses = scheduleData[day].filter(
    (entry) => entry.teacher === teacher
  );
  let timeSlots = teacherClasses.map((entry) => entry.timeSlot).sort(); // Sort by time slots
  let consecutiveCount = 0;
  let maxConsecutive = 0;

  // Count consecutive time slots
  for (let i = 1; i < timeSlots.length; i++) {
    if (timeSlots[i] === timeSlots[i - 1] + 1) {
      consecutiveCount++;
    } else {
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      consecutiveCount = 0; // Reset if not consecutive
    }
  }
  return Math.max(maxConsecutive, consecutiveCount); // Return the highest consecutive count
}

// Generate provisional routine based on available teachers
// Helper function to count consecutive classes for a teacher
function countConsecutiveClasses(teacher, day) {
  let teacherClasses = scheduleData[day].filter(
    (entry) => entry.teacher === teacher
  );
  let timeSlots = teacherClasses.map((entry) => entry.timeSlot).sort(); // Sort by time slots
  let consecutiveCount = 0;
  let maxConsecutive = 0;

  // Count consecutive time slots
  for (let i = 1; i < timeSlots.length; i++) {
    if (timeSlots[i] === timeSlots[i - 1] + 1) {
      consecutiveCount++;
    } else {
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
      consecutiveCount = 0; // Reset if not consecutive
    }
  }
  return Math.max(maxConsecutive, consecutiveCount); // Return the highest consecutive count
}




function generateProvisionalRoutine() {
  document.getElementById("loader-overlay").style.display = "flex";
  setTimeout(() => {
    document.getElementById("loader-overlay").style.display = "none";
  }, 5000);

  const day = document.getElementById("daySelect").value;
  const provisionalTable = document.getElementById("provisionalTable");
  provisionalTable.innerHTML = "";

  if (day && scheduleData[day]) {
    replacementTeachers = availableTeachers.filter(
      (teacher) => !absentTeachers.includes(teacher)
    );

    // Create a map to track the number of classes for each replacement teacher
    let teacherClassCount = {};
    replacementTeachers.forEach((teacher) => {
      teacherClassCount[teacher] = 0;
    });

    // Count classes for each available teacher
    scheduleData[day].forEach((entry) => {
      if (replacementTeachers.includes(entry.teacher)) {
        teacherClassCount[entry.teacher]++;
      }
    });

    // Helper function to check consecutive classes
    function getConsecutiveClasses(entries, index) {
      const classLevel = entries[index].class;
      const section = entries[index].section;
      let consecutiveClasses = [entries[index]];

      // Check if next classes are consecutive
      for (let i = index + 1; i < entries.length; i++) {
        if (entries[i].class === classLevel && entries[i].section === section) {
          if (entries[i].timeSlot === entries[i - 1].timeSlot + 1) {
            consecutiveClasses.push(entries[i]);
          } else {
            break;
          }
        }
      }
      return consecutiveClasses;
    }

    // Generate the provisional routine for absent teachers
    scheduleData[day].forEach((entry, index) => {
      if (absentTeachers.includes(entry.teacher)) {
        const absentTeacherSubject = entry.subject;
        const timeSlot = entry.timeSlot;
        const classLevel = entry.class;

        // Get all consecutive classes for the absent teacher
        const consecutiveClasses = getConsecutiveClasses(scheduleData[day], index);

        let subjectTeachers = replacementTeachers.filter((teacher) => {
          const isSameSubject = scheduleData[day].some(
            (e) => e.teacher === teacher && e.subject === absentTeacherSubject
          );
          const isFreeAtTimeSlot = !scheduleData[day].some(
            (e) => e.teacher === teacher && e.timeSlot === timeSlot
          );
          return isSameSubject && isFreeAtTimeSlot;
        });

        // If no same-subject teacher is available for Class 11/12, mark as Off Period
        if ((classLevel === "Grade 11" || classLevel === "Grade 12") && subjectTeachers.length === 0) {
          consecutiveClasses.forEach((classEntry) => {
            let row = `<tr>
              <td>${classEntry.class}</td>
              <td>${classEntry.section}</td>
              <td>${classEntry.teacher}</td>
              <td>Off Period</td>
              <td>${classEntry.timeSlot}</td>
            </tr>`;
            provisionalTable.innerHTML += row;
          });
          return; // Skip to the next iteration
        }

        // Check if all consecutive classes can be allocated to a single teacher
        let fullAllocationPossible = subjectTeachers.some((teacher) => {
          return consecutiveClasses.every((classEntry) => {
            return !scheduleData[day].some(
              (e) => e.teacher === teacher && e.timeSlot === classEntry.timeSlot
            );
          });
        });

        if (fullAllocationPossible) {
          // Allocate one teacher for all consecutive classes
          let replacementTeacher = subjectTeachers.shift();
          consecutiveClasses.forEach((classEntry) => {
            teacherClassCount[replacementTeacher]++;
            let row = `<tr>
              <td>${classEntry.class}</td>
              <td>${classEntry.section}</td>
              <td>${classEntry.teacher}</td>
              <td>${replacementTeacher || "N/A"}</td>
              <td>${classEntry.timeSlot}</td>
            </tr>`;
            provisionalTable.innerHTML += row;
          });
        } else {
          // Allocate partially or mark as Off Period
          consecutiveClasses.forEach((classEntry, i) => {
            let replacementTeacher = subjectTeachers.find((teacher) => {
              return !scheduleData[day].some(
                (e) => e.teacher === teacher && e.timeSlot === classEntry.timeSlot
              );
            });
            
            if (replacementTeacher && i === 0) {
              teacherClassCount[replacementTeacher]++;
              let row = `<tr>
                <td>${classEntry.class}</td>
                <td>${classEntry.section}</td>
                <td>${classEntry.teacher}</td>
                <td>${replacementTeacher}</td>
                <td>${classEntry.timeSlot}</td>
              </tr>`;
              provisionalTable.innerHTML += row;
            } else {
              // Mark as "Off Period" for the rest of consecutive classes
              let row = `<tr>
                <td>${classEntry.class}</td>
                <td>${classEntry.section}</td>
                <td>${classEntry.teacher}</td>
                <td>Off Period</td>
                <td>${classEntry.timeSlot}</td>
              </tr>`;
              provisionalTable.innerHTML += row;
            }
          });
        }
      }
    });

    document.getElementById("provisionalRoutineSection").style.display = "block";
  } else {
    document.getElementById("provisionalRoutineSection").style.display = "none";
  }
}
