# Piano Coach MVP

## Resumen

Piano Coach MVP es una aplicación web progresiva para practicar piezas de piano desde un móvil colocado en horizontal. La aplicación desplaza una representación simplificada de la partitura, muestra un teclado completo ajustado al ancho de la pantalla y utiliza el micrófono para estimar la nota tocada.

El proyecto está desarrollado con **HTML, CSS y JavaScript puro**. No requiere Flutter, Android Studio ni Xcode para revisar el código o hacer una primera prueba. Puede instalarse como PWA cuando se publica en HTTPS.

## Funciones incluidas

- Interfaz optimizada para móvil en orientación apaisada.
- Vista de ejecución casi a pantalla completa.
- Partitura en la zona superior y teclado en la inferior.
- Barra mínima con pausa, salida, estado y progreso.
- Teclados de 25, 37, 49, 61, 76 y 88 teclas.
- Todas las teclas se ajustan al ancho disponible, sin desplazamiento horizontal.
- Teclado de 37 teclas con rango C2-C5.
- Marcadores de solfeo de colores en el teclado de 37 teclas.
- Ayuda visual de la tecla esperada, que puede desactivarse.
- Captura y análisis local del micrófono.
- Detección monofónica mediante una implementación del algoritmo YIN.
- Mensajes específicos para diagnosticar errores de permiso del micrófono.
- Calibración guiada de octava mediante Do, Mi y Sol, con ajuste guardado en el dispositivo.
- Modo de interpretación continua, que espera la primera nota antes de poner en marcha el desplazamiento.
- Modo que espera hasta detectar la nota correcta.
- Previsualización sonora de la pieza mediante síntesis Web Audio.
- Desplazamiento compacto de la partitura para mostrar más notas próximas en pantalla.
- Resaltado de teclas durante la previsualización.
- Dos piezas incluidas: **Oda a la alegría** y **Estrellita**.
- Importación de piezas mediante JSON.
- Importación directa de archivos MIDI (`.mid` y `.midi`) con extracción automática de una melodía monofónica.
- Service worker para funcionamiento sin conexión después de la primera carga.
- Manifiesto e iconos para instalación como PWA.

## Diseño durante la práctica

Al empezar una práctica o una previsualización, la configuración, las métricas y los controles secundarios se ocultan. La pantalla se distribuye así:

```text
┌──────────────────────────────────────────────────────────────┐
│ Pausa · Salir · Título · Estado · Notas · Progreso          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                  PARTITURA DESPLAZABLE                       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│               TECLADO COMPLETO AJUSTADO                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

La aplicación muestra un aviso que cubre la interfaz cuando el móvil está en vertical. El manifiesto solicita `landscape-primary` y la aplicación intenta bloquear la orientación horizontal cuando el navegador o la PWA instalada lo permiten.

## Teclado de 37 teclas

El teclado de 37 teclas utiliza el rango MIDI 36-72, correspondiente a C2-C5. Las teclas blancas muestran marcadores circulares de solfeo:

- `do`: azul celeste.
- `re`: amarillo.
- `mi`: rojo coral.
- `fa`: violeta.
- `sol`: verde.
- `la`: rosa.
- `si`: naranja.

Los marcadores se repiten en cada octava. La tecla actual aumenta ligeramente el marcador y añade un contorno para facilitar su identificación.

## Previsualización de piezas

El botón **Escuchar** inicia un modo independiente de previsualización:

- La pieza suena mediante un sintetizador local basado en Web Audio API.
- La partitura avanza con el tempo seleccionado.
- Las teclas correspondientes se iluminan.
- No se registran aciertos ni errores.
- El micrófono no se utiliza para validar la previsualización.

Se recomienda usar auriculares si el micrófono está activo, especialmente antes de comenzar una práctica, para evitar que el sonido de los altavoces genere detecciones accidentales.


## Calibración de octava

Si el detector identifica las notas una octava por encima o por debajo, pulsa **Calibrar** y toca en orden las tres teclas que la aplicación marca: Do, Mi y Sol de la misma octava. Debes soltar cada tecla antes de tocar la siguiente.

La aplicación compara las tres lecturas, calcula un desplazamiento global de hasta dos octavas y lo guarda en el almacenamiento local del dispositivo. El botón de calibración muestra el ajuste activo. La opción **Restablecer** vuelve a cero semitonos.

## Reconocimiento mediante micrófono

El flujo de análisis es:

```text
Micrófono
  ↓
Buffer de audio
  ↓
Cálculo de volumen RMS
  ↓
Estimación YIN de la frecuencia fundamental
  ↓
Conversión a nota MIDI
  ↓
Estabilización durante varias lecturas
  ↓
Comparación con la nota esperada
```

La conversión utilizada es:

```text
midi = 69 + 12 × log2(frecuencia / 440)
```

El audio se analiza localmente en el dispositivo. El MVP no sube ni almacena grabaciones.

## Solución de problemas del micrófono en Chrome

El micrófono necesita un contexto seguro. La app debe abrirse desde:

- Una dirección `https://`.
- `http://localhost` durante pruebas en el mismo ordenador.

Abrir `index.html` directamente o acceder desde el móvil a una dirección como `http://192.168.x.x` puede impedir el acceso al micrófono.

La aplicación distingue los errores más habituales y muestra instrucciones específicas.

### Permiso del sitio bloqueado

En Chrome:

1. Abre la dirección HTTPS de la aplicación.
2. Toca el icono de ajustes situado junto a la dirección.
3. Abre **Permisos**.
4. Selecciona **Micrófono**.
5. Marca **Permitir**.
6. Regresa a la aplicación y pulsa **Reintentar**.

### Permiso de Android bloqueado

1. Abre **Ajustes** de Android.
2. Entra en **Aplicaciones**.
3. Selecciona **Chrome**.
4. Abre **Permisos**.
5. Permite el uso del **Micrófono**.

En una PWA instalada, el permiso sigue asociado al sitio web. Puede ser necesario abrir la misma dirección en Chrome y revisar sus permisos.

### Micrófono ocupado

Cierra llamadas, grabadoras, asistentes de voz u otras aplicaciones que puedan estar utilizando el micrófono. Después vuelve a la app y pulsa **Reintentar**.

## Cómo ejecutar el proyecto sin Flutter

### Opción 1: Python 3

```bash
cd piano-coach-mvp
python3 -m http.server 8080
```

Abre en el ordenador:

```text
http://localhost:8080
```

Esta opción permite probar la interfaz y el micrófono en el mismo ordenador porque `localhost` se considera un contexto seguro.

### Opción 2: Node.js

```bash
cd piano-coach-mvp
npx serve .
```

### Opción 3: servidor local de un editor

Puede utilizarse una extensión como Live Server en Visual Studio Code.

### Probar en un móvil

Para probar el micrófono en un teléfono, publica la carpeta en un alojamiento HTTPS, por ejemplo:

- GitHub Pages.
- Netlify.
- Cloudflare Pages.
- Vercel.
- Un servidor propio con certificado HTTPS.

## Instalación como PWA

### Android con Chrome

1. Publica la aplicación en HTTPS.
2. Abre la URL en Chrome.
3. Abre el menú de tres puntos.
4. Selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.
5. Confirma la instalación.

### iPhone o iPad

1. Abre la URL HTTPS en Safari.
2. Toca **Compartir**.
3. Selecciona **Añadir a pantalla de inicio**.
4. Confirma con **Añadir**.

En iOS, el bloqueo automático de orientación de una PWA puede depender de la versión del sistema. La interfaz seguirá mostrando el aviso para girar el dispositivo.

## Estructura del proyecto

```text
piano-coach-mvp/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── DESCRIPCION_PROYECTO.md
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── pieces/
    ├── demo.json
    └── twinkle.json
```

## Importar un archivo MIDI

Pulsa **Añadir JSON/MIDI** y selecciona un archivo `.mid` o `.midi`. La conversión se realiza completamente en el navegador y no necesita conexión ni sube el archivo a ningún servidor.

La aplicación:

- Lee archivos MIDI estándar de tipo 0, 1 y 2 con resolución PPQN.
- Ignora el canal de percusión.
- Elige automáticamente la pista o canal que más probablemente contiene la melodía.
- En acordes simultáneos conserva la nota más aguda.
- Recorta solapamientos para obtener una línea monofónica compatible con el modo de práctica.
- Utiliza el tempo y el compás iniciales del archivo.

Los MIDI con ambas manos mezcladas en una sola pista pueden requerir una revisión posterior, ya que la extracción de melodía es automática. Los cambios de tempo posteriores al inicio se simplifican a un tempo único porque el formato actual de la aplicación usa un solo valor BPM.

## Formato de las piezas

Ejemplo:

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

Campos:

- `midi`: número MIDI de la nota. El do central es 60.
- `startBeat`: pulso de inicio.
- `durationBeats`: duración en pulsos.
- `tempo`: pulsos por minuto.
- `timeSignature`: compás mostrado en la representación.

## Limitaciones actuales

- El reconocimiento es monofónico.
- Los acordes pueden dar resultados incorrectos.
- Los armónicos del piano pueden provocar errores de octava.
- La precisión depende del móvil, del piano y de la acústica de la habitación.
- El detector todavía utiliza un umbral de volumen fijo.
- No existe aún una calibración guiada de ruido o latencia.
- La partitura es una representación simplificada; todavía no interpreta MusicXML.
- No se analizan pedal, dinámica ni duración real de la pulsación.
- El sintetizador de previsualización es aproximado y no utiliza muestras grabadas de piano.

## Próximos pasos recomendados

1. Añadir calibración automática de ruido y latencia.
2. Incorporar importación MIDI.
3. Sustituir la partitura simplificada por MusicXML y un motor de notación.
4. Mejorar la detección de ataques y resonancias.
5. Añadir repetición de compases y práctica por manos.
6. Guardar sesiones e historial de progreso.
7. Empaquetar la PWA con Capacitor cuando el MVP esté validado.
