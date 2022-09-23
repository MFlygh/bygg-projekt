'use strict';

const projectsCol = document.querySelector('.project_list');
const markersList = document.querySelector('.markers');

// Controls
const zoomIn = document.querySelector('#zoom-in');
const zoomOut = document.querySelector('#zoom-out');
const zoomMax = document.querySelector('#zoom-max');

// Filters
const dateFilter = document.querySelector('.date-picker-wrapper');
const dateStartInput = document.querySelector('#date-start');
const dateEndInput = document.querySelector('#date-end');
const dateStartDisplay = document.querySelector('#start-handle');
const dateEndDisplay = document.querySelector('#end-handle');

class Project {
	constructor(coords, img, description, id, title, type, dateEnd) {
		this.title = title;
		this.coords = coords;
		this.img = img;
		this.description = description;
		this.id = id;
		this.type = type;
		this.dateEnd = dateEnd;
	}
}

class App {
	#map;
	#projects = [];
	#markers = [];
	#markerCluster = L.markerClusterGroup({
		removeOutsideVisibleBounds: false,
		maxClusterRadius: 50,
	});

	constructor() {
		this._getProjects();
		this._loadMap();
		this._createControl();
		this._initDateSlider();
		this._runFilters();
		this._disableControl();

		projectsCol.addEventListener('click', this._moveToPopup.bind(this));
	}

	_loadMap() {
		this.#map = L.map('map', {
			zoomControl: false,
			minZoom: 5,
			maxZoom: 14,
		}).setView([58.5322805, 14.6118545], 7);
		L.tileLayer(
			'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
			{
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			}
		).addTo(this.#map);
		this.#projects.forEach((project) => {
			this._renderProjectMarker(project);
		});
		// add To this map missing!!!!!
		this.#map.addLayer(this.#markerCluster);
	}

	_renderProjectMarker(project) {
		const marker = L.marker(project.coords, {
			icon: L.icon({
				iconUrl: markersList.querySelector(`#${project.type}`).src,
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [0, -20],
				className: `marker-${project.type}`,
			}),
		})
			.bindPopup(
				L.popup({
					maxWidth: 256,
					minWidth: 256,
					autoClose: true,
					closeOnClick: true,
					className: 'popup_wrapper',
					autoPan: false,
					closeButton: false,
				})
			)
			.setPopupContent(
				`
                <img src="${project.img}" loading="lazy" alt="" class="popup_img">
                <div class="popup_content-wrapper">
                    <div class="popup_title">${project.title}</div>
                    <div class="popup_description">${project.description}</div>
                </div>
                `
			);
		this.#markerCluster.addLayer(marker);
		// marker._icon.setAttribute('data-id', project.id);
		const marker2 = this.#markerCluster.getLayers().slice(-1);

		this.#markers.push(marker);
	}

	_getProjects() {
		const projects = document.querySelectorAll('.project_item');

		projects.forEach((pro) => {
			const title = pro.querySelector('.project_title').textContent;
			const description = pro.querySelector(
				'.project_description'
			).textContent;
			const img = pro.querySelector('.project_img').src;
			const lat = pro.querySelector('.project_lat').textContent;
			const lng = pro.querySelector('.project_lng').textContent;
			const id = +pro.querySelector('.project_id').textContent;
			const type = pro
				.querySelector('.project_type')
				.textContent.toLowerCase()
				.replaceAll(' ', '-');
			const progress = pro.querySelector('.project_status');

			const dateStartEl = pro.querySelector('.project_date-start');
			const dateStart = new Date(dateStartEl.textContent).getTime();
			dateStartEl.textContent = dateStart;

			const dateEndEl = pro.querySelector('.project_date-end');
			const dateEnd = new Date(dateEndEl.textContent).getTime();
			dateEndEl.textContent = dateEnd;

			this._calcProgress(progress, dateStart, dateEnd);

			const project = new Project(
				[lat, lng],
				img,
				description,
				id,
				title,
				type,
				dateEnd
			);
			this.#projects.push(project);
		});
	}

	_moveToPopup(e) {
		if (!this.#map) return;

		const projectEl = e.target.closest('.project_item');

		const projectElID = projectEl.querySelector('.project_id').textContent;

		const project = this.#projects.find((proj) => proj.id === +projectElID);

		this.#map.flyTo(project.coords, 13, {
			duration: 2,
		});

		const marker = this.#markerCluster
			.getLayers()
			.find((mark) => +mark._icon.dataset.id === project.id);
		this.#markerCluster.openPopup(project.coords);
	}

	_createControl() {
		zoomIn.addEventListener(
			'click',
			function (e) {
				this.#map.zoomIn();
			}.bind(this)
		);
		zoomOut.addEventListener(
			'click',
			function () {
				this.#map.zoomOut();
			}.bind(this)
		);
		zoomMax.addEventListener(
			'click',
			function () {
				if (this.#markers.length === 0) {
					this.#map.flyTo([58.5322805, 14.6118545], 7, {
						duration: 2,
					});
				} else {
					this.#map.flyToBounds(
						this.#markers.map((mark) => [mark._latlng])
					);
				}
			}.bind(this)
		);
	}

	_disableControl() {
		this.#map.on('zoomend', function (e) {
			const currentZoom = e.sourceTarget._zoom;
			if (currentZoom === 14) {
				zoomIn.classList.add('zoom-disable');
			} else {
				zoomIn.classList.remove('zoom-disable');
			}
			if (currentZoom === 5) {
				zoomOut.classList.add('zoom-disable');
			} else {
				zoomOut.classList.remove('zoom-disable');
			}
		});
	}

	_calcProgress(progressEl, dateStart, dateEnd) {
		const today = new Date().getTime();

		const progress = Math.round(
			((today - dateStart) / (dateEnd - dateStart)) * 100
		);

		progressEl.style.width = `${progress}%`;
	}

	_initDateSlider() {
		const dates = this.#projects.map((dateEnd) => dateEnd.dateEnd);
		const minDate = Math.min(...dates);
		const maxDate = Math.max(...dates);

		dateFilter.setAttribute('fs-rangeslider-max', maxDate);
		dateFilter.setAttribute('fs-rangeslider-min', minDate);

		this._displayDate(dateStartInput, dateStartDisplay);
		this._displayDate(dateEndInput, dateEndDisplay);
	}

	_displayDate(input, display) {
		input.addEventListener('change', (e) => {
			const data = +e.target.value;
			const date = new Date(data);
			const month = date.toLocaleString('default', { month: 'short' });
			const year = date.getFullYear();
			display.textContent = `${month} ${year}`;
		});
	}

	_runFilters() {
		window.fsAttributes = window.fsAttributes || [];
		window.fsAttributes.push([
			'cmsfilter',
			(filterInstances) => {
				const [filterInstance] = filterInstances;

				filterInstance.listInstance.on(
					'renderitems',
					(renderedItems) => {
						this.#projects = [];
						this.#markers.forEach((marker) => {
							marker.remove();
						});
						this.#markers = [];
						this.#markerCluster.clearLayers();
						this._getProjects();
						this.#projects.forEach((project) => {
							this._renderProjectMarker(project);
						});
					}
				);
			},
		]);
	}
}

const app = new App();
