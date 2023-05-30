// import functions and export variable to the HTML (for use in the Header)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.9/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/9.6.9/firebase-database.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.9/firebase-auth.js";
export let SITETOCHANGE;

//Configure the connection to the firebase database
const firebaseConfig = {
  apiKey: "AIzaSyBLx7I2CG4untuYO2uIaimgbEg2OzVTzGE",
  authDomain: "ipadbookingsystem-a9620.firebaseapp.com",
  databaseURL: "https://ipadbookingsystem-a9620-default-rtdb.firebaseio.com",
  projectId: "ipadbookingsystem-a9620",
  storageBucket: "ipadbookingsystem-a9620.appspot.com",
  messagingSenderId: "689403159691",
  appId: "1:689403159691:web:8a032b018d86278fb3a08e",
  measurementId: "G-Q41ZKE5LM3"
};


// Good 'ol global variables
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const staffNameInput = document.getElementById('staff-name-input');
const ipadList = document.getElementById('ipad-list');
const bookIpadsButton = document.getElementById('book-ipads');
const returnIpadsButton = document.getElementById('return-ipads');



function updateHeaderText(siteName) {
  const bookingSystemTitle = document.getElementById('booking-system-title');
  bookingSystemTitle.classList.add('title-transition');
  bookingSystemTitle.style.opacity = '0';

  setTimeout(() => {
    bookingSystemTitle.innerHTML = `MSA ${siteName} iPad Booking System`;
    bookingSystemTitle.style.opacity = '1';
  }, 100);
}

export function updateInitialHeaderText(siteName) {
  const bookingSystemTitle = document.getElementById('booking-system-title');
  bookingSystemTitle.innerHTML = `MSA ${siteName} iPad Booking System`;
}

function initializeAppLogic() {
  const siteSelector = document.getElementById('site-selector');

  if (localStorage.getItem('selectedSite')) {
    siteSelector.value = localStorage.getItem('selectedSite');
    SITETOCHANGE = siteSelector.value;
  } else {
    SITETOCHANGE = "Unspecified";
    siteSelector.value = SITETOCHANGE;
  }
  updateInitialHeaderText(SITETOCHANGE);

  siteSelector.addEventListener('change', () => {
    handleSiteChange(siteSelector.value);
  });

async function handleSiteChange(siteName) {
  localStorage.setItem('selectedSite', siteName);

  SITETOCHANGE = siteName;

  updateHeaderText(SITETOCHANGE); 

  localStorage.setItem('fadeCompleted', 'true');

  window.location.reload();

  setTimeout(() => {
    updateHeaderText(SITETOCHANGE);
  }, 1);
}

  const reserveIpadsButton = document.getElementById("reserve-ipads");
  const calendarEl = document.getElementById('calendar');
  let calendar;
  const ipadRef = ref(db, `Site/${SITETOCHANGE}/iPads`);
  const staffRef = ref(db, `Site/${SITETOCHANGE}/staffNames`);

  let iPads = [];
  let staffNames = [];

  function updateCalendarEvents() {
    const bookedIpadGroups = iPads.reduce((groups, ipad) => {
      if (ipad.status.startsWith('Booked by')) {
        const parts = ipad.status.match(/Booked by (.+?) at (.+?) on (.+?) due back at (.+)/);
        if (parts) {
          const staffName = parts[1];
          const bookedDateTime = moment(`${parts[3]} ${parts[2]}`, 'DD/MM/YYYY hh:mm A');
          const dueBackDateTime = moment(`${parts[3]} ${parts[4]}`, 'DD/MM/YYYY hh:mm A');
          const start = bookedDateTime.toDate();
          const end = dueBackDateTime.toDate();
          const ipadNum = ipad.ipadNum.split(' ').pop();
          const bookingId = `${staffName}-${start.getTime()}`;
          if (groups[bookingId]) {
            groups[bookingId].ipadNums.push(ipadNum);
          } else {
            groups[bookingId] = {
              ipadNums: [ipadNum],
              start,
              end,
              staffName
            };
          }
        }
      }
      return groups;
    }, {});

    const events = [];
    const reservationGroups = {};
    iPads.forEach(ipad => {
      if (ipad.reservation) {
        const reservations = ipad.reservation.split('|');
        reservations.forEach(reservation => {
          const parsedReservation = JSON.parse(reservation);
          const startTime = moment(parsedReservation.reservationDateTime, 'YYYY-MM-DD:HH:mm:ss').toDate();
          const endTime = moment(startTime).add(parsedReservation.returnTime, 'minutes').toDate();
          const ipadNum = ipad.ipadNum.split(' ').pop();
          const staffName = parsedReservation.staffName;

          const reservationId = `${staffName}-${startTime.getTime()}`;
          if (reservationGroups[reservationId]) {
            reservationGroups[reservationId].ipadNums.push(ipadNum);
          } else {
            reservationGroups[reservationId] = {
              ipadNums: [ipadNum],
              start: startTime,
              end: endTime,
              staffName
            };
          }
        });
      }
    });
    for (const reservationId in reservationGroups) {
      const { start, end, ipadNums, staffName } = reservationGroups[reservationId];
      const title = `iPad/s #:${ipadNums.join(', ')} RESERVED - ${staffName}`;
      events.push({ title, start, end, staffName, extendedProps: { staffName } });
    }

    for (const bookingId in bookedIpadGroups) {
      const { start, end, ipadNums, staffName } = bookedIpadGroups[bookingId];
      const title = `iPad/s #:${ipadNums.join(', ')} BOOKED - ${staffName}`;
      events.push({ title, start, end, staffName });
    }

    if (calendar) {
      calendar.setOption('events', events);
    } else {
      const colorMap = {};
      let colorIndex = 0;
      const colors = ['#FF5733', '#33FF57', '#5733FF', '#FF33F4'];
      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
          start: '',
          center: 'title',
          end: 'prev,next'
        },
        firstDay: moment().subtract(1, 'days').day(),
        dayHeaderContent: function (info) {
          return moment(info.date).format('dddd DD/MM');
        },
        hiddenDays: [0, 6],
        allDaySlot: false,
        slotMinTime: '08:00:00',
        slotMaxTime: '18:15:00',
        slotDuration: '00:15:00',
        eventColor: 'rgba(0, 0, 0, 0)',
        height: 'auto',
        slotLabelFormat: {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        },
        events: events,
        nowIndicator: true,
        eventDidMount: function (info) {
          const eventEl = info.el;

          const staffName = info.event.extendedProps.staffName;
          if (!colorMap[staffName]) {
            colorMap[staffName] = colors[colorIndex];
            colorIndex++;
            if (colorIndex >= colors.length) {
              colorIndex = 0;
            }
          }

          const hexColor = colorMap[staffName];
          const rgbaColor = `rgba(${parseInt(hexColor.slice(1, 3), 16)}, ${parseInt(hexColor.slice(3, 5), 16)}, ${parseInt(hexColor.slice(5, 7), 16)}, 0.7)`;
          eventEl.style.backgroundColor = rgbaColor;

          const popover = document.createElement('div');
          popover.className = 'fc-popover';
          popover.textContent = info.event.title;
          eventEl.appendChild(popover);

          popover.style.display = 'none';

          eventEl.addEventListener('mouseenter', function () {
            if (!popover.classList.contains('active')) {
              popover.style.display = 'block';
            }
          });
          eventEl.addEventListener('mouseleave', function () {
            if (!popover.classList.contains('active')) {
              popover.style.display = 'none';
            }
          });
        },
        slotEventOverlap: false,
        eventOverlap: function (stillEvent, movingEvent) {
          return stillEvent.allDay && movingEvent.allDay &&
            stillEvent.start.getTime() === movingEvent.start.getTime();
        }
      });
      calendar.render();
    }
  }


  onValue(ipadRef, (snapshot) => {
    iPads = Object.entries(snapshot.val() || []).map(([key, value]) => ({
      ...value,
      key
    }));
    updateUI();
  });

  onValue(staffRef, (snapshot) => {
    staffNames = Object.values(snapshot.val() || []);
    updateUI();
  });

  function updateUI() {
    if (!iPads || !staffNames) return;
  
    // Sort iPads by name
    iPads.sort((a, b) => {
      const numberPattern = /\d+/;
      const aNumber = parseInt(a.ipadNum.match(numberPattern));
      const bNumber = parseInt(b.ipadNum.match(numberPattern));
      return aNumber - bNumber;
    });
  
    // Clear existing iPad list items
    ipadList.innerHTML = '';
  
    // Populate iPad list
    iPads.forEach((ipad) => {
      const li = document.createElement('li');
      li.className = 'ipad-item';
  
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ipad-checkbox';
      checkbox.id = `ipad-${ipad.key}`;
      checkbox.setAttribute("data-ipad-key", ipad.key);
      checkbox.setAttribute("data-ipad-name", ipad.ipadNum);
  
      const label = document.createElement('label');
      label.htmlFor = `ipad-${ipad.key}`;
      label.textContent = `${ipad.ipadNum} - ${ipad.status}`;
  
      li.appendChild(checkbox);
      li.appendChild(label);
      ipadList.appendChild(li);
    });
  
    // Create hidden "Select All" checkbox and label
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'select-all';
    selectAllCheckbox.style.display = 'none';
  
    const selectAllLabel = document.createElement('label');
    selectAllLabel.htmlFor = 'select-all';
    selectAllLabel.textContent = '-----Select-All-----';
  
    // Create custom "Select All" checkbox-like element
    const customCheckbox = document.createElement('span');
    customCheckbox.className = 'custom-checkbox';
  
    // Append "Select All" elements to the ipadList after the loop
    ipadList.appendChild(selectAllCheckbox);
    ipadList.appendChild(customCheckbox);
    ipadList.appendChild(selectAllLabel);
  
    // Add event listener to custom "Select All" checkbox-like element
    customCheckbox.addEventListener('click', (e) => {
      const isChecked = !selectAllCheckbox.checked;
      selectAllCheckbox.checked = isChecked;
      customCheckbox.classList.toggle('checked', isChecked);
  
      const ipadCheckboxes = document.querySelectorAll('.ipad-checkbox');
      ipadCheckboxes.forEach((checkbox) => {
        checkbox.checked = isChecked;
      });
    });
  
    updateCalendarEvents();
  }
  const iPadsChecklist = iPads.map(ipad => document.getElementById(`ipad-${ipad.key}`));

  bookIpadsButton.addEventListener('click', async () => {
    const selectedStaff = staffNameInput.value;
    if (!selectedStaff) {
      alert('Please enter your name before booking an iPad.');
      return;
    }
  
    if (!iPads) return;
  
   let dueBackSelect = document.getElementById("return-time");
   let dueBackOption;
   if (dueBackSelect.value === 'custom') {
     dueBackOption = getCustomDueBackTime();
   } else {
     dueBackOption = dueBackSelect.options[dueBackSelect.selectedIndex].value;
   }

function getCustomDueBackTime() {
  const customTime = document.getElementById('custom-time').value;
  const customTimeUnit = document.getElementById('custom-time-unit').value;
  let dueBackTimeInMinutes;
  
  switch (customTimeUnit) {
    case 'minutes':
      dueBackTimeInMinutes = customTime;
      break;
    case 'hours':
      dueBackTimeInMinutes = customTime * 60;
      break;
    case 'days':
      dueBackTimeInMinutes = customTime * 60 * 24;
      break;
  }
  
  return dueBackTimeInMinutes;
}
  if (dueBackOption > 600) {
    alert('For multi-day bookings, please reserve iPads instead of booking them.');
    return;
  }
  
    if (!dueBackOption || dueBackOption === 'default') {
      alert('Please select a return time before booking an iPad.');
      return;
    }
  
    const currentTime = new Date();
    const bookingStartTime = currentTime;
    const bookingEndTime = new Date(Date.now() + (dueBackOption * 60 * 1000));
  
    let availableIpads = iPads.filter(ipad => {
      const checkbox = document.getElementById(`ipad-${ipad.key}`);
      return checkbox.checked && ipad.status === 'Available';
    });

const unavailableIpads = iPads.filter(ipad => {
  const checkbox = document.getElementById(`ipad-${ipad.key}`);
  return checkbox.checked && ipad.status !== 'Available';
});


if (unavailableIpads.length > 0) {
  const unavailableIpadNumbers = unavailableIpads.map(ipad => {
    const ipadNum = ipad.ipadNum.split(' ').pop(); 
    return ipadNum;
  }).join(', ');
  alert(`The following iPads are not available for booking: ${unavailableIpadNumbers}`);
  return;
  }

    for (const ipad of availableIpads) {
      if (ipad.reservation) {
        const reservations = ipad.reservation.split('|');
        for (const reservation of reservations) {
          const parsedReservation = JSON.parse(reservation);
          const reservationStart = moment(parsedReservation.reservationDateTime, 'YYYY-MM-DD:HH:mm:ss').toDate();
          const reservationEnd = moment(reservationStart).add(parsedReservation.returnTime, 'minutes').toDate();
  
          if ((bookingStartTime >= reservationStart && bookingStartTime <= reservationEnd) ||
            (bookingEndTime >= reservationStart && bookingEndTime <= reservationEnd) ||
            (bookingStartTime <= reservationStart && bookingEndTime >= reservationEnd)) {
            availableIpads = availableIpads.filter(availIpad => availIpad.key !== ipad.key);
            const reservationStartTime = reservationStart.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
            const reservationEndTime = reservationEnd.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
            alert(`The following iPads are not available for booking: ${ipad.deviceName}. ${parsedReservation.staffName} has reserved these iPads from ${reservationStartTime} to ${reservationEndTime}.`);
            break;
          }
        }
      }
    }
  
    if (availableIpads.length > 0) {
      const currentTimeString = currentTime.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
      const currentDateString = moment(currentTime).format('DD/MM/YYYY');
      const returnDateObj = new Date(Date.now() + (dueBackOption * 60 * 1000));
      const returnTimeString = returnDateObj.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
      const returnDateString = moment(returnDateObj).format('DD/MM/YYYY');
      const returnDateTimeString = `${returnDateString} at ${returnTimeString}`;

    
      const ipadNumbers = availableIpads.map(ipad => {
        const ipadNum = ipad.ipadNum.split(' ').pop(); 
        return ipadNum;
      }).join(', ');
      if (ipadNumbers.length === 0) {
         alert("Please select at least one iPad before booking.");
         return;
       }
      const returnTimeFormatted = dueBackOption >= 60 ? `${dueBackOption / 60} hours` : `${dueBackOption} minutes`;
    
      const confirmationMessage = `Just confirming, you want to book iPad/s ${ipadNumbers} under the name "${selectedStaff}" for the duration of ${returnTimeFormatted}.`;
      const userConfirmation = confirm(confirmationMessage);
    
      if (userConfirmation) {
        for (const ipad of availableIpads) {
          ipad.status = `Booked by ${staffNameInput.value} at ${currentTimeString} on ${currentDateString} due back at ${returnTimeString}`;
          set(ref(db, `Site/${SITETOCHANGE}/iPads/${ipad.key}/status`), ipad.status);
        }
      } else {
        return;
      }
    }
    
    updateUI();
  });



  reserveIpadsButton.addEventListener("click", () => {
    if (!staffNameInput.value) {
      alert('Please enter your name before reserving an iPad.');
      return;
    }
  
    const dueBackSelect = document.getElementById('return-time');
    const dueBackOption = dueBackSelect.options[dueBackSelect.selectedIndex].value;
    if (!dueBackOption || dueBackOption === 'default') {
      alert('Please select a return time before reserving an iPad.');
      return;
    }
  
    const staffName = document.getElementById("staff-name-input").value;
    let returnTime = document.getElementById("return-time").value;

    if (returnTime === 'custom') {
      returnTime = getCustomDueBackTime();
    }
    
    function getCustomDueBackTime() {
      const customTime = document.getElementById('custom-time').value;
      const customTimeUnit = document.getElementById('custom-time-unit').value;
      let dueBackTimeInMinutes;
      
      switch (customTimeUnit) {
        case 'minutes':
          dueBackTimeInMinutes = customTime;
          break;
        case 'hours':
          dueBackTimeInMinutes = customTime * 60;
          break;
        case 'days':
          dueBackTimeInMinutes = customTime * 60 * 24;
          break;
      }
      
      return dueBackTimeInMinutes;
    }
    const iPadsChecklist = document.querySelectorAll(".ipad-checkbox");
    const reservationDate = document.getElementById("reservation-date").value;
    const reservationTime = document.getElementById("reservation-time").value;
  
    if (!reservationDate || !reservationTime) {
      alert("Please enter a reservation date and time.");
      return;
    }
  
    const reservationDateTime = `${reservationDate}:${reservationTime}:00`;
  
    const newReservation = {
      staffName,
      reservationDateTime,
      returnTime,
    };
  

    const returnTimeFormatted = dueBackOption >= 60 ? `${dueBackOption / 60} hours` : `${dueBackOption} minutes`;
const ipadNumbers = Array.from(iPadsChecklist).filter(checkbox => checkbox.checked).map(checkbox => {
  const ipadName = checkbox.getAttribute('data-ipad-name'); 
  if (ipadName) {
    const ipadNum = ipadName.split(' ').pop(); 
    return ipadNum;
  }
}).filter(num => num !== undefined).join(', ');

 if (ipadNumbers.length === 0) {
   alert("Please select at least one iPad before reserving.");
   return;
 }

    const reservationDateObj = new Date(reservationDate);
    const dayofReservation = reservationDateObj.toLocaleDateString('en-AU', { weekday: 'long' });
    const reservationDateFormatted = reservationDateObj.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
    const reservationTimeFormatted = new Date(`1970-01-01T${reservationTime}:00`).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
    const confirmationMessage = `Just confirming, you want to book iPad/s ${ipadNumbers} under the name "${staffName}" for the duration of ${returnTimeFormatted} on ${dayofReservation} ${reservationDateFormatted} at ${reservationTimeFormatted}.`;
    const userConfirmation = confirm(confirmationMessage);
  
    if (!userConfirmation) {
      return;
    }
  
    let count = 0;
    const totalChecked = Array.from(iPadsChecklist).filter(checkbox => checkbox.checked).length;
    iPadsChecklist.forEach((checkbox) => {
      if (checkbox.checked) {
        const ipadKey = checkbox.getAttribute("data-ipad-key");
        const reservationRef = ref(
          db,
          `Site/${SITETOCHANGE}/iPads/${ipadKey}/reservation`
        );
  
        get(reservationRef)
        .then((snapshot) => {
          const existingReservations = snapshot.val() || "";
          if (existingReservations.includes(reservationDateTime)) {
            alert("An iPad is already reserved for the selected time slot.");
          } else {
            const updatedReservations = existingReservations
              ? existingReservations + "|" + JSON.stringify(newReservation)
              : JSON.stringify(newReservation);
            set(reservationRef, updatedReservations);
          }
          count++;
          if (count === totalChecked) {
            updateUI();
          }
        })
        .catch((error) => {
          console.error("Error fetching reservations:", error);
        });
      }
    });
  });


  returnIpadsButton.addEventListener('click', () => {
    const checkedIpads = iPads.filter(ipad => {
      const checkbox = document.getElementById(`ipad-${ipad.key}`);
      return checkbox.checked;
    });

    checkedIpads.forEach(ipad => {
      set(ref(db, `Site/${SITETOCHANGE}/iPads/${ipad.key}/status`), "Available");
    });

    updateUI();
  });
  // Asynchronously deletes expired reservations for all iPads
  async function resetReservations() {
    const currentTime = new Date();

    // Iterate over all iPads
    for (const ipad of iPads) {
      // If the iPad has a reservation
      if (ipad.reservation) {
        // Split the reservation string into an array of individual reservations
        const reservations = ipad.reservation.split('|');
        const updatedReservations = [];

        // Iterate over each reservation
        for (const reservation of reservations) {
          // Parse the reservation string into a JavaScript object
          const parsedReservation = JSON.parse(reservation);

          // Convert the reservation start time and end time from strings to Date objects
          const reservationStart = moment(parsedReservation.reservationDateTime, 'YYYY-MM-DD:HH:mm:ss').toDate();
          const reservationEnd = moment(reservationStart).add(parsedReservation.returnTime, 'minutes').toDate();

          // If the reservation has expired, don't add it to the updated reservations array
          if (currentTime <= reservationEnd) {
            updatedReservations.push(reservation);
          }
        }

        // Update the reservation string in the database for this iPad
        const reservationRef = ref(db, `Site/${SITETOCHANGE}/iPads/${ipad.key}/reservation`);
        const newReservations = updatedReservations.join('|');
        await set(reservationRef, newReservations);
      }
    }
  }

  // Call the resetReservations function at the end of the day
  const endOfDay = moment().endOf('day');
  const timeUntilEndOfDay = endOfDay.diff(moment(), 'milliseconds');
  setTimeout(resetReservations, timeUntilEndOfDay);
}

document.addEventListener('DOMContentLoaded', () => {
  signInAnonymously(auth)
    .then((user) => {
      initializeAppLogic();
    })
    .catch((error) => {
      console.error('Error signing in anonymously:', error);
    });
}); 
window.resetReservations = function(siteName) {
  // Get a reference to the iPads at the specified site
  const iPadsRef = ref(db, `Site/${siteName}/iPads`);

  // Retrieve iPads data from Firebase
  get(iPadsRef).then((snapshot) => {
    // Iterate over each iPad
    snapshot.forEach((ipadSnapshot) => {
      // Get the iPad key
      const ipadKey = ipadSnapshot.key;

      // Create a reference to the reservation for the current iPad
      const reservationRef = ref(db, `Site/${siteName}/iPads/${ipadKey}/reservation`);

      // Update the reservation to an empty string
      set(reservationRef, '');
    });
  });
};
