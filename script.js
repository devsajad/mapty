'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapEv;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    this.#getPosition();
    form.addEventListener('submit', this.#newWorkOut.bind(this));
    inputType.addEventListener('change', this.#toggleElevationField);
    containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
    this.#getLocalStorage();
  }

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), error);
    } else {
      alert('Geolocation is not supported by this browser.');
    }
    function error(err) {
      console.warn(`ERROR(${err.code}): ${err.message}`);
    }
  }

  #loadMap(pos) {
    const { latitude, longitude } = pos.coords;
    const cords = [latitude, longitude];
    this.#map = L.map('map').setView(cords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);
    this.#map.on('click', this.#showForm.bind(this));

    this.#workouts.forEach(element => {
      this.#renderWorkoutMarker(element);
    });
  }

  #showForm(mapEvent) {
    this.#mapEv = mapEvent;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  #newWorkOut(e) {
    e.preventDefault();
    const { lat, lng } = this.#mapEv.latlng;
    // Validatin fuctions
    function isInputsNumber(...inputs) {
      return inputs.every(input => Number.isFinite(input));
    }
    function isInputsPositive(...inputs) {
      return inputs.every(input => input > 0);
    }
    // Get data from Form
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const optionalInputValue = +inputCadence.value || +inputElevation.value;

    // If workout cycling, create cycling object
    let workout;
    if (inputType.value === 'cycling') {
      // Check if data is valid
      if (
        !isInputsNumber(distance, duration, optionalInputValue) ||
        !isInputsPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      // create Object
      workout = new Cycling([lat, lng], distance, duration, optionalInputValue);
    }
    if (inputType.value === 'running') {
      if (
        !isInputsNumber(distance, duration, optionalInputValue) ||
        !isInputsPositive(distance, duration, optionalInputValue)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      // create object
      workout = new Running([lat, lng], distance, duration, optionalInputValue);
    }
    // Add new object to workout array
    this.#workouts.push(workout);
    // Render workout on map as marker
    this.#renderWorkoutMarker(workout);
    // Render workOut on list
    this.#renderWorkout(workout);
    // Hide form + clear input fields
    this.#hideForm();
    // Store workout in LocalStorage
    this.#setLocalStorage();
  }
  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  #getLocalStorage() {
    const LocalStorageWorkouts = JSON.parse(localStorage.getItem('workouts'));
    if (!LocalStorageWorkouts) return;
    this.#workouts = LocalStorageWorkouts;
    // Render workouts
    LocalStorageWorkouts.forEach(element => {
      this.#renderWorkout(element);
    });
  }
  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  #renderWorkout(workout) {
    const workoutEelement = `<li class="workout workout--${
      workout.type
    }" data-id=${workout.id}>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>${
            workout.type === 'running'
              ? `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>`
              : `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">KM/H</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">M</span>
          </div>`
          }
        </li>`;
    form.insertAdjacentHTML('afterend', workoutEelement);
  }
  #hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  #moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const clickedWorkout = this.#workouts.find(
      workout => workout.id === workoutEl.dataset.id
    );
    this.#map.setView(clickedWorkout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    clickedWorkout.incNumber();
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
// Workout Classes
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // Unique ID based on timestamp
  number = 0;
  constructor(coords, distance, duration) {
    this.distance = distance; //km
    this.duration = duration; //min
    this.coords = coords; // [lat , long]
  }
  setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  incNumber() {
    this.number++;
  }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.pace = this.#calcPace();
    this.setDescription();
    this.incNumber();
  }
  #calcPace() {
    return this.duration / this.distance; // min / km
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.speed = this.#calcSpeed();
    this.setDescription();
    this.incNumber();
  }
  #calcSpeed() {
    return this.distance / (this.duration / 60); // Km/h
  }
}
const app = new App();
