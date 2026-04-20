# Prestamo de Equipos

Aplicacion local de escritorio para Windows con Tauri + SQLite.

## Flujo base

1. Captura o escanea el `codigo` del alumno en `Modo Operacion`.
2. Si el alumno no tiene prestamo activo, selecciona `PRESTAMO`, elige equipo y registra.
3. Si el alumno tiene prestamo activo, cambia a `DEVOLUCION` y registra.
4. En `Panel Admin` administra alumnos, grupos, equipos e historial.

## Comandos

```powershell
npm install
npm run dev
```

## Importacion Excel

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import_excel.ps1 `
  -ExcelPath "C:\ruta\archivo.xlsx" `
  -DatabasePath "$env:APPDATA\com.institucion.prestamosequipos\prestamos.sqlite" `
  -CatalogSheet "Catalogo" `
  -EventsSheet "Eventos"
```
# taefotoapp-windows
