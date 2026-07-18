# Piano Coach MVP

## Resumen

Piano Coach MVP es un prototipo móvil para aprender y practicar piezas de piano. Muestra una partitura simplificada que avanza con el tempo de la pieza, representa un teclado configurable y utiliza el micrófono del dispositivo para estimar la nota tocada.

El prototipo se ha construido como una **aplicación web progresiva (PWA)** con HTML, CSS y JavaScript. No requiere Flutter para revisar el código ni para ejecutar una primera prueba.

## Objetivos del MVP

- Mostrar las notas próximas antes de que lleguen a la línea de ejecución.
- Mantener la partitura sincronizada con un tempo configurable.
- Representar teclados de 25, 49, 61, 76 y 88 teclas.
- Permitir activar o desactivar la indicación de la tecla esperada.
- Capturar audio con el micrófono del móvil u ordenador.
- Detectar una nota principal cada vez y compararla con la nota esperada.
- Registrar aciertos, errores, omisiones e intentos incorrectos.
- Ofrecer un modo continuo y otro que espera hasta recibir la nota correcta.
- Permitir añadir piezas mediante un archivo JSON sencillo.

## Alcance actual

La primera versión está orientada a melodías monofónicas o práctica de una mano. La detección de acordes completos no forma parte de este MVP, porque separar varias notas simultáneas mediante el micrófono de un móvil requiere un sistema de análisis más avanzado.

La partitura es una representación musical simplificada sobre pentagrama. No pretende sustituir todavía a un motor completo de notación musical como OpenSheetMusicDisplay, VexFlow o un importador MusicXML.

## Tecnologías

- HTML5.
- CSS3 adaptable a móvil.
- JavaScript sin frameworks.
- Web Audio API para acceder al micrófono.
- Algoritmo YIN para estimar la frecuencia fundamental.
- Canvas 2D para dibujar y desplazar la partitura.
- Service Worker y manifiesto web para instalación como PWA.
- Almacenamiento local para recordar preferencias básicas.

## Estructura del proyecto

```text
piano-coach-mvp/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── DESCRIPCION_PROYECTO.md
└── pieces/
    └── demo.json
```

## Cómo ejecutar el prototipo

El acceso al micrófono no funciona correctamente abriendo `index.html` directamente como archivo. Hay que servir la carpeta mediante HTTP local o publicarla en HTTPS.

### Opción 1: Python

Si el equipo tiene Python 3:

```bash
cd piano-coach-mvp
python3 -m http.server 8080
```

Después abre en el navegador:

```text
http://localhost:8080
```

### Opción 2: Node.js

Si el equipo tiene Node.js:

```bash
cd piano-coach-mvp
npx serve .
```

La terminal mostrará la dirección local que debe abrirse.

### Opción 3: editor con servidor local

También puede utilizarse una extensión de servidor local, por ejemplo Live Server en Visual Studio Code.

### Opción 4: probarlo en un móvil

Los navegadores móviles exigen normalmente una conexión HTTPS para permitir el micrófono. La forma más sencilla es publicar la carpeta en un servicio de alojamiento estático con HTTPS, como GitHub Pages, Netlify, Cloudflare Pages o Vercel.

Otra opción es utilizar un servidor HTTPS local o un túnel de desarrollo. Acceder al servidor del ordenador mediante una dirección de red `http://192.168.x.x` puede no ser suficiente para que el navegador móvil autorice el micrófono.

## Uso

1. Abrir la aplicación desde `localhost` o una dirección HTTPS.
2. Pulsar **Activar micrófono** y aceptar el permiso.
3. Seleccionar el modo de práctica.
4. Ajustar el tempo y el número de teclas.
5. Pulsar **Empezar**.
6. Tocar notas individuales de forma clara y sostenida.
7. Revisar los aciertos, errores y la precisión provisional.

Para reducir errores de detección conviene:

- Colocar el móvil cerca del piano, pero no directamente sobre la caja de resonancia.
- Reducir el ruido de fondo.
- Evitar que otras personas hablen durante la prueba.
- Usar auriculares si se añade metrónomo o acompañamiento sonoro en una versión posterior.
- Tocar una sola nota cada vez durante este MVP.

## Formato para añadir piezas

Las piezas se importan mediante JSON. Ejemplo:

```json
{
  "title": "Escala de Do",
  "composer": "Ejercicio",
  "tempo": 80,
  "timeSignature": "4/4",
  "description": "Ejercicio ascendente",
  "notes": [
    { "midi": 60, "startBeat": 0, "durationBeats": 1 },
    { "midi": 62, "startBeat": 1, "durationBeats": 1 },
    { "midi": 64, "startBeat": 2, "durationBeats": 1 },
    { "midi": 65, "startBeat": 3, "durationBeats": 1 }
  ]
}
```

Campos principales:

- `midi`: número MIDI de la nota. El do central es 60.
- `startBeat`: pulso en el que empieza la nota.
- `durationBeats`: duración expresada en pulsos.
- `tempo`: pulsos por minuto.

## Reconocimiento de notas

El flujo de audio es:

```text
Micrófono
  ↓
Buffer de audio
  ↓
Cálculo de volumen RMS
  ↓
Estimación YIN de frecuencia fundamental
  ↓
Conversión de frecuencia a nota MIDI
  ↓
Estabilización durante varias lecturas
  ↓
Comparación con la nota esperada
```

La conversión principal es:

```text
midi = 69 + 12 × log2(frecuencia / 440)
```

La aplicación exige varias lecturas consecutivas de la misma nota antes de aceptarla. Esto ayuda a reducir detecciones inestables causadas por ruido, golpes o armónicos del piano.

## Modos de práctica

### Interpretación continua

La partitura avanza según el tempo aunque se produzcan errores. Al terminar, las notas no validadas se marcan como omitidas.

### Esperar nota correcta

La partitura permanece en la nota actual hasta que el micrófono detecta la nota correcta. Este modo es más apropiado para principiantes y para validar la precisión del detector.

## Limitaciones conocidas

- La detección es monofónica.
- Los acordes pueden producir resultados incorrectos.
- Los armónicos del piano pueden provocar errores de octava.
- La sensibilidad depende del modelo de móvil, la habitación y la distancia al instrumento.
- El algoritmo actual utiliza un umbral fijo de volumen y todavía no incluye una calibración guiada.
- La precisión rítmica es aproximada y no compensa todavía la latencia específica del dispositivo.
- La partitura no interpreta MusicXML ni MIDI.
- No se analizan dinámica, pedal ni duración real de la tecla.
- El navegador puede suspender el audio si la pantalla se bloquea o la aplicación pasa a segundo plano.

## Siguientes pasos recomendados

1. Añadir una pantalla de calibración de ruido y latencia.
2. Incorporar importación MIDI.
3. Sustituir el pentagrama simplificado por un motor MusicXML.
4. Mejorar la detección de ataques para distinguir notas nuevas de resonancias anteriores.
5. Añadir tolerancias configurables para ritmo y afinación.
6. Guardar sesiones e historial de progreso.
7. Crear cuentas de usuario y sincronización opcional.
8. Añadir ejercicios por mano y repetición de compases.
9. Evaluar modelos polifónicos para acordes sencillos.
10. Empaquetar la PWA como aplicación nativa con Capacitor o una tecnología equivalente cuando el producto esté validado.

## Criterios de validación del MVP

El prototipo será útil si puede demostrar de forma repetible que:

- La partitura se desplaza de manera fluida.
- El usuario entiende cuál es la nota actual y cuál viene después.
- La indicación del teclado puede activarse y desactivarse.
- El micrófono reconoce correctamente notas aisladas en un entorno razonablemente silencioso.
- El modo de espera avanza al tocar la nota correcta.
- El informe básico ayuda a identificar errores.

## Privacidad

El audio se procesa localmente en el navegador. Este MVP no envía grabaciones a un servidor. Aun así, el navegador solicitará permiso explícito para utilizar el micrófono.

## Instalación como PWA en el móvil

La aplicación incluye manifiesto web, service worker e iconos para Android e iOS. Para que el navegador permita instalarla, debe publicarse mediante **HTTPS**; abrir `index.html` directamente desde el gestor de archivos no es suficiente.

### Android (Chrome)

1. Abre la dirección HTTPS de la aplicación en Chrome.
2. Pulsa el menú de tres puntos.
3. Selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.
4. Acepta la instalación.

### iPhone o iPad (Safari)

1. Abre la dirección HTTPS en Safari.
2. Pulsa **Compartir**.
3. Selecciona **Añadir a pantalla de inicio**.
4. Confirma con **Añadir**.

El permiso del micrófono se solicita al pulsar **Activar micrófono**. El acceso al micrófono también requiere HTTPS, salvo durante pruebas locales en `localhost`.
