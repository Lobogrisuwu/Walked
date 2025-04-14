let map;
let directionsService;

function showLogin() {
  document.getElementById("register-form").style.display = "none";
  document.getElementById("login-form").style.display = "block";
}

function showRegister() {
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
}

function register() {
  const username = document.getElementById("reg-username").value;
  const password = document.getElementById("reg-password").value;

  if (!username || !password) {
    alert("Rellena todos los campos.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || {};

  if (users[username]) {
    alert("Este usuario ya existe.");
    return;
  }

  users[username] = CryptoJS.SHA256(password).toString();
  localStorage.setItem("users", JSON.stringify(users));
  alert("Usuario registrado correctamente");
  showLogin();
}

function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const users = JSON.parse(localStorage.getItem("users")) || {};

  if (users[username] && users[username] === CryptoJS.SHA256(password).toString()) {
    alert("Inicio de sesión exitoso");
    localStorage.setItem("loggedInUser", username);
    showApp();
  } else {
    alert("Usuario o contraseña incorrectos.");
  }
}

function logout() {
  localStorage.removeItem("loggedInUser");
  document.getElementById("main-app").style.display = "none";
  document.getElementById("auth-container").style.display = "block";
  showLogin();
}

function showApp() {
  document.getElementById("auth-container").style.display = "none";
  document.getElementById("main-app").style.display = "block";
}

// Auto-login si ya está logueado
window.onload = function() {
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    showApp();
    initMap();
    cargarZonasGuardadas();
  }
};
let directionsRenderer;
let zonasPeligrosas = [];
let marcandoZona = false;
let modoOscuro = false;

function initMap() {
  const estiloNocturno = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }]
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }]
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }]
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }]
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }]
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }]
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }]
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }]
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }]
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }]
    }
  ];

  const hora = new Date().getHours();
  const mapOptions = {
    center: { lat: 20.659698, lng: -103.349609 },
    zoom: 13
  };

  if (hora >= 18 || hora < 6) {
    mapOptions.styles = estiloNocturno;
  }

  map = new google.maps.Map(document.getElementById("map"), mapOptions);

  let lastMousePosition = null;

  // Guardar la última posición del mouse
  map.addListener('mousemove', (event) => {
    lastMousePosition = event.latLng;
  });

  // Agregar evento de tecla
  document.addEventListener('keydown', (event) => {
    if (lastMousePosition && event.target.tagName !== 'INPUT') {
      const key = event.key.toLowerCase();
      let tipoPeligro = null;

      switch(key) {
        case 'p': tipoPeligro = 'puente_roto'; break;
        case 's': tipoPeligro = 'paso_peatonal'; break;
        case 'c': tipoPeligro = 'construccion'; break;
        case 'z': tipoPeligro = 'zona_choque'; break;
        case 'x': tipoPeligro = 'zona_cerrada'; break;
      }

      if (tipoPeligro) {
        document.getElementById('tipoPeligro').value = tipoPeligro;
        agregarZonaPeligrosa(lastMousePosition);
      }
    }
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map);

  // Agregar evento de clic en el mapa
  map.addListener('click', (event) => {
    if (marcandoZona) {
      agregarZonaPeligrosa(event.latLng);
    }
  });
}

function calculateRoute() {
  const origin = document.getElementById("origin").value;
  const destination = document.getElementById("destination").value;
  const travelMode = document.getElementById("travelMode").value;

  const request = {
    origin: origin,
    destination: destination,
    travelMode: travelMode === 'BICYCLING' ? google.maps.TravelMode.BICYCLING : google.maps.TravelMode.WALKING,
    provideRouteAlternatives: true,
    avoidHighways: true,
    avoidTolls: true,
    optimizeWaypoints: true,
    avoidFerries: true,
    unitSystem: google.maps.UnitSystem.METRIC,
    transitOptions: {
      routingPreference: 'LESS_WALKING'
    },
  };

  directionsService.route(request, function(result, status) {
    if (status == "OK") {
      directionsRenderer.setDirections(result);
    } else {
      alert("No se pudo encontrar la ruta.");
    }
  });
}

function mostrarMenuZonaPeligrosa() {
  document.getElementById('zonaPeligrosaModal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('zonaPeligrosaModal').style.display = 'none';
  marcandoZona = false;
}

function iniciarMarcadoZona() {
  marcandoZona = true;
  map.setOptions({ 
    draggableCursor: 'crosshair',
    draggable: false,
    scrollwheel: false
  });
  cerrarModal();
}

function getColorPorTipo(tipo) {
  const colores = {
    puente_roto: '#FF0000', // Rojo
    paso_peatonal: '#FFA500', // Naranja
    zona_choque: '#FF0000', // Rojo
    zona_cerrada: '#800080', // Púrpura
    construccion: '#FFD700' // Amarillo
  };
  return colores[tipo] || '#FF0000';
}

function guardarZonas() {
  const data = zonasPeligrosas.map(z => ({
    lat: z.location.lat(),
    lng: z.location.lng(),
    tipo: z.tipo
  }));
  localStorage.setItem("zonasPeligrosas", JSON.stringify(data));
}

function cargarZonasGuardadas() {
  const data = JSON.parse(localStorage.getItem("zonasPeligrosas") || "[]");
  data.forEach(z => {
    const location = new google.maps.LatLng(z.lat, z.lng);
    document.getElementById('tipoPeligro').value = z.tipo;
    agregarZonaPeligrosa(location);
  });
}

function agregarZonaPeligrosa(location) {
  const tipoPeligro = document.getElementById('tipoPeligro').value;
  const color = getColorPorTipo(tipoPeligro);
  const latLng = {
    lat: location.lat(),
    lng: location.lng()
  };

  // Crear el marcador
  const marker = new google.maps.Marker({
    position: latLng,
    map: map,
    icon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
    title: getTipoPeligroTexto(tipoPeligro)
  });

  // Crear círculo rojo semitransparente
  const circle = new google.maps.Circle({
    map: map,
    center: latLng,
    radius: 100,  // radio en metros
    fillColor: color,
    fillOpacity: 0.3,
    strokeColor: color,
    strokeWeight: 2
  });

  // Agregar información al marcador
  const infowindow = new google.maps.InfoWindow({
    content: getTipoPeligroTexto(tipoPeligro)
  });

  marker.addListener('click', () => {
    infowindow.open(map, marker);
  });

  zonasPeligrosas.push({
    location: location,
    marker: marker,
    circle: circle,
    tipo: tipoPeligro
  });

  marcandoZona = false;
  map.setOptions({ 
    draggableCursor: null,
    draggable: true,
    scrollwheel: true
  });
  guardarZonas();
}

function getTipoPeligroTexto(tipo) {
  const tipos = {
    puente_roto: "Puente Roto",
    paso_peatonal: "Paso Peatonal sin Pintar",
    zona_choque: "Zona de Choque",
    zona_cerrada: "Zona Cerrada",
    construccion: "Construcción"
  };
  return tipos[tipo] || "Zona Peligrosa";
}

function cambiarModo() {
  modoOscuro = !modoOscuro;
  document.body.classList.toggle('dark-mode');

  // Actualizar el mapa
  const mapOptions = {
    ...map.getOptions(),
    styles: modoOscuro ? estiloNocturno : null
  };
  map.setOptions(mapOptions);
}