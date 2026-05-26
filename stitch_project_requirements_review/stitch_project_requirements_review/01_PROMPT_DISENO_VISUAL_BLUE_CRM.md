# PROMPT MAESTRO — DISEÑO VISUAL / UI-UX DE BLUE CRM (`crm.biombos.cl`)

## 0. Uso de este documento

Este documento es un **prompt maestro para diseño visual**. Está pensado para entregarlo a una IA de diseño como **Google Stitch**, Figma AI, Lovable, v0, Galileo, Uizard u otra herramienta visual.

El objetivo es generar **pantallas de referencia** para reconstruir `crm.biombos.cl`, también llamado **Blue CRM / Blue Impresión**.

No debe diseñarse un CRM genérico. Debe diseñarse una app interna moderna para una empresa de impresión, plotter, tintas, inventario, pedidos, cotizaciones, proveedores y finanzas.

---

# 1. Identidad general de la app

Diseña una aplicación web llamada **Blue CRM** o **Blue Impresión**.

Es un sistema interno para una empresa de impresión y plotter. La app administra:

- clientes
- productos
- inventario
- materiales
- tintas
- pedidos
- pedidos PDF
- archivos de trabajo
- trabajos de producción
- módulo plotter
- finanzas
- proveedores
- cotizaciones
- configuración del negocio

La app debe sentirse como una herramienta profesional para producción gráfica, no como un CRM blanco genérico.

Debe tener una estética **dark, técnica, moderna, delicada y elegante**, con énfasis en claridad operativa.

---

# 2. Estilo visual obligatorio

## 2.1. Estética base

Usar una estética:

- dark mode
- moderna
- técnica
- elegante
- limpia
- profesional
- visualmente cuidada
- con detalles suaves y bien terminados
- orientada a uso diario en escritorio
- responsive para tablets y móvil

La imagen de referencia muestra un sistema con:

- fondo oscuro azul/gris
- sidebar lateral oscuro
- color principal azul eléctrico / azul intenso
- acentos naranjo/ámbar para alertas y stock bajo
- cards oscuras
- bordes sutiles
- tablas limpias
- pestañas modernas
- botones con estilo
- topbar con indicadores monetarios

## 2.2. Colores sugeridos

Paleta sugerida:

```text
Fondo principal: #0F172A / #111827 / #0B1120
Sidebar: #0B1220 / #111827
Cards: #1E293B / #172033
Bordes: #334155 / rgba(255,255,255,0.08)
Azul principal: #2563EB / #3B82F6
Azul claro: #60A5FA
Naranjo alerta: #F59E0B / #FB923C
Rojo error: #EF4444
Verde éxito: #22C55E
Texto principal: #F8FAFC
Texto secundario: #94A3B8
Texto tenue: #64748B
```

No usar una app blanca genérica. El modo oscuro es parte de la identidad.

## 2.3. Tipografía

Usar una tipografía moderna y legible:

- Inter
- Geist
- Manrope
- Satoshi
- IBM Plex Sans

Jerarquías claras:

- títulos grandes, limpios y de peso medio/semibold
- subtítulos más pequeños y suaves
- métricas destacadas
- tablas con texto compacto pero legible

## 2.4. Componentes visuales

Debe incluir:

- sidebar lateral
- topbar con indicadores rápidos
- cards de resumen
- tablas con encabezados oscuros
- badges de estado
- tabs/pestañas modernas
- botones primarios azules
- botones secundarios oscuros con borde
- botones de alerta en naranjo/rojo
- inputs y selects estilizados, nunca selects HTML feos
- modales limpios
- drawers laterales para detalles
- filtros y buscadores bien integrados

---

# 3. Navegación principal

La app debe tener un sidebar izquierdo con estos módulos:

```text
Dashboard
Clientes
Productos
Inventario
Pedidos
Pedidos PDF
Archivos
Trabajos
Plotter
Finanzas
Proveedores
Cotizaciones
Configuración
```

Cada ítem debe tener un icono simple y moderno.

El sidebar debe mostrar marca:

```text
Blue CRM
Blue Impresión
```

Con subtítulo opcional:

```text
Gestión inteligente para impresión
```

El módulo activo debe destacarse con azul.

---

# 4. Layout base

## 4.1. Estructura general

La app debe tener:

- sidebar fijo a la izquierda
- área principal con título de módulo
- topbar superior con indicadores rápidos
- contenido en cards/tabs/tablas
- diseño desktop-first
- responsive con menú colapsable

## 4.2. Topbar

La topbar puede mostrar:

- valor dólar / tasa actual
- Binance / tasa referencial
- usuario actual
- botón “Nuevo pedido”
- botón “Nueva cotización”
- buscador global

Ejemplo visual:

```text
$ Dólar: 38,5 Bs | Binance: 259,9 Bs | Usuario | Nueva Cotización
```

---

# 5. Pantalla Dashboard

Diseñar dashboard principal con métricas de operación.

## Cards superiores

Mostrar cards como:

- Ventas del mes
- Pedidos activos
- Cotizaciones pendientes
- Clientes activos
- Stock bajo
- Por cobrar
- Trabajos en producción
- Solicitudes de compra pendientes

Cada card debe tener:

- icono
- métrica grande
- subtítulo
- comparación o estado breve
- color según tipo

## Secciones del dashboard

Incluir:

- pedidos recientes
- trabajos urgentes
- stock crítico
- finanzas resumidas
- cotizaciones recientes
- proveedores o compras pendientes

El dashboard debe ser visual y operativo, no decorativo.

---

# 6. Pantalla Clientes

Diseñar módulo de clientes.

## Vista lista

Debe tener:

- buscador por nombre, teléfono, cédula/RIF o email
- filtros: activo/inactivo, con descuento, con deuda
- tabla moderna
- botón “Nuevo cliente”

Columnas sugeridas:

- Nombre completo
- Cédula/RIF
- Teléfono
- Email
- Descuento %
- Estado
- Última actualización
- Acciones

## Ficha de cliente

Diseñar una ficha lateral o página detalle con:

- datos principales
- porcentaje de descuento personalizado
- estado activo/inactivo
- historial de pedidos
- historial de cotizaciones
- saldo o pagos pendientes
- notas internas

El descuento del cliente debe ser visible, porque es parte importante del sistema.

---

# 7. Pantalla Productos

Diseñar módulo de productos.

Los productos representan servicios o productos imprimibles que tienen precio, costos y reglas de producción.

## Lista de productos

Columnas sugeridas:

- Producto
- Categoría
- Precio m²
- Tipo de cobro
- Máquina asociada
- Perfil de tinta
- Margen %
- Activo

## Ficha de producto

Debe mostrar:

- nombre
- descripción
- categoría
- precio m²
- tipo de cobro
- costo material estimado m²
- costo tinta m²
- costo mano de obra m²
- margen de ganancia
- máquina asociada
- perfil de tinta
- materiales asociados

## Diseño importante

Debe verse como una ficha técnica comercial, no como un formulario simple.

---

# 8. Pantalla Inventario

Esta pantalla es crítica. Debe parecerse a la referencia enviada.

## Título

```text
Gestión de Inventario
```

Subtítulo:

```text
Control de materiales, tintas, stock bajo y consumo por pedidos.
```

## Cards superiores

Cards principales:

```text
Total Materiales
Total Tintas
Stock Materiales Bajo
Stock Tintas Bajo
```

Usar azul para totales y naranjo/rojo para stock bajo.

## Pestañas

Crear tabs:

```text
Materiales
Tintas
En Camino
Historial Consumo
```

## Tab Materiales

Tabla con:

- Material
- Tipo
- Ancho
- Largo original
- Largo restante
- Unidad
- Stock / cantidad actual
- Mínimo
- Precio m² o precio unitario
- Proveedor
- Estado
- Acciones

## Tab Tintas

Tabla con:

- Tinta
- Marca
- Máquina
- Color
- Cantidad
- Mínimo
- Unidad
- Costo por cc
- Proveedor
- Estado

Debe permitir representar tintas CMYK:

- Magenta
- Cian
- Amarillo
- Negro

## Tab En Camino

Mostrar compras o solicitudes pendientes:

- Material/tinta
- Proveedor
- Cantidad
- Estado
- Fecha compra
- Fecha estimada
- Estado de pago

## Tab Historial Consumo

Debe dividir historial en dos tablas:

### Historial de Consumo de Tinta

Columnas:

- Fecha
- Tinta
- Máquina
- Producto
- Medida
- Magenta
- Cian
- Amarillo
- Negro
- Pedido/Cliente

### Historial de Consumo de Materiales

Columnas:

- Fecha
- Material
- Ancho
- Cantidad consumida
- Pedido/Cliente

Debe verse técnico y claro.

---

# 9. Pantalla Pedidos

Diseñar módulo de pedidos como centro operativo.

## Lista de pedidos

Debe incluir:

- buscador
- filtros por estado, prioridad, fecha, cliente, pago
- botón “Nuevo pedido”
- badges de prioridad y estado

Columnas:

- Pedido
- Cliente
- Producto
- Medidas
- m²
- Máquina
- Precio total
- Estado
- Prioridad
- Pago
- Fecha límite
- Acciones

## Estados visuales

```text
pendiente
confirmado
en producción
en revisión
listo
entregado
cancelado
```

## Detalle de pedido

Debe mostrar:

- cliente
- producto
- material
- medidas
- metros cuadrados
- máquina a usar
- archivo de trabajo
- PDF asociado
- costos
- pago
- consumo de material
- consumo de tinta
- trabajos asociados

## Costos visibles

Mostrar una sección financiera del pedido:

- costo material
- costo tinta
- costo overhead
- costo máquina
- costo total
- ganancia bruta
- margen real
- abono
- monto pagado
- saldo

---

# 10. Pantalla Pedidos PDF

Diseñar módulo para gestionar documentos PDF de pedidos.

Debe permitir:

- ver pedidos con PDF generado
- ver pedidos sin PDF
- descargar PDF
- subir comprobante o archivo asociado
- estado del documento

Diseño:

- cards o tabla
- iconos PDF
- estado visible

---

# 11. Pantalla Archivos

Módulo para archivos de trabajo.

Debe mostrar:

- archivos subidos
- archivo de trabajo del pedido
- comprobantes de pago
- PDFs
- imágenes o diseños
- relación con pedido/cliente

Debe tener filtros:

- por cliente
- por pedido
- por tipo de archivo
- por fecha

---

# 12. Pantalla Trabajos

Módulo de producción.

Los trabajos están vinculados a pedidos.

## Vista lista o tablero

Columnas:

- Trabajo
- Pedido
- Cliente
- Descripción
- m²
- Material
- Máquina asignada
- Prioridad
- Estado
- Fecha estimada

## Estados

```text
pendiente
programado
en producción
pausado
completado
cancelado
```

Diseñar como tablero operativo, idealmente con cards por estado.

---

# 13. Pantalla Plotter

El módulo Plotter debe ser técnico, pero fácil.

Debe ayudar a calcular trabajos de impresión/corte.

## Elementos visuales

- calculadora de medidas
- ancho
- alto
- cantidad
- metros cuadrados calculados
- material
- máquina
- velocidad/calidad
- consumo estimado
- costo estimado
- precio sugerido

## Máquina

Debe poder mostrar máquinas como:

- nombre
- marca
- modelo
- ancho máximo
- velocidad calidad m²/h
- velocidad producción m²/h
- velocidad draft m²/h
- activa/inactiva
- tercero/no tercero

## Resultado visual

Mostrar:

- m² totales
- tiempo estimado
- costo material
- costo tinta
- costo máquina
- costo total
- margen
- precio sugerido

---

# 14. Pantalla Finanzas

Diseñar módulo financiero operativo.

Debe mostrar:

- ingresos
- egresos
- caja
- movimientos
- pedidos pagados
- pedidos con saldo
- compras pendientes de pago
- utilidad estimada
- margen real

## Tabla movimientos de caja

Columnas:

- Fecha
- Tipo
- Monto
- Concepto
- Método de pago
- Referencia
- Pedido asociado

## Cards financieras

- Ventas del mes
- Ingresos
- Egresos
- Por cobrar
- Por pagar
- Ganancia estimada
- Margen promedio

---

# 15. Pantalla Proveedores

Diseñar módulo de proveedores y compras.

## Proveedores

Campos visibles:

- nombre
- RIF
- teléfono
- email
- contacto principal
- moneda
- crédito
- días de crédito
- cuenta por pagar

## Compras

Debe mostrar:

- proveedor
- número factura
- fecha factura
- monto total
- monto pagado
- estado
- moneda
- archivo factura
- fecha vencimiento

## Solicitudes de compra

Debe incluir:

- solicitante
- estado
- fecha necesidad
- items solicitados
- estado de pago
- notas

---

# 16. Pantalla Cotizaciones

Diseñar módulo de cotizaciones.

Existen dos conceptos posibles en la base:

- cotizaciones / cotizacion_items
- quotes / quote_items

Visualmente deben unificarse en una experiencia clara.

## Lista

Columnas:

- Número / nombre
- Cliente
- Estado
- Subtotal
- Margen
- Impuesto
- Total
- Fecha
- Pedido asociado

## Editor de cotización

Debe permitir:

- seleccionar cliente
- agregar items
- usar catálogo
- calcular subtotal
- aplicar margen
- aplicar impuesto
- calcular total
- convertir en pedido

## Item

Campos:

- descripción
- cantidad
- precio unitario
- total línea
- regla de cálculo si aplica
- costo unitario
- merma

---

# 17. Pantalla Configuración

Diseñar configuración general del negocio.

Debe incluir:

- margen default
- moneda
- gastos fijos
- total gastos fijos mes
- producción estimada m² mes
- tasa dólar / Binance
- parámetros de precios
- parámetros de stock bajo
- máquinas
- perfiles de tinta
- categorías de productos

Debe verse como panel administrativo moderno, no como lista seca.

---

# 18. Componentes obligatorios

Generar diseños con estos componentes:

- sidebar dark
- topbar con tasa/moneda
- cards de métricas
- tabs modernas
- tablas con filtros
- botones primarios azules
- botones de alerta naranjo
- badges de estado
- modales para crear/editar
- drawer de detalle
- formularios con inputs estilizados
- selects custom
- empty states cuidados
- loaders delicados

---

# 19. Pantallas mínimas que debe generar la IA de diseño

Pedir a la IA visual que genere, idealmente, estas pantallas:

1. Dashboard principal
2. Inventario — Materiales/Tintas/Historial consumo
3. Pedidos — lista y detalle
4. Plotter — calculadora técnica
5. Finanzas — dashboard y movimientos
6. Cotizaciones — editor
7. Clientes — lista y ficha
8. Proveedores — compras y solicitudes
9. Productos — ficha técnica
10. Configuración — negocio, máquinas y precios

---

# 20. Reglas finales para Google Stitch / IA visual

Diseña una aplicación web realista y lista para desarrollo.

No crear mockups genéricos.

No usar diseño blanco tipo SaaS común.

No usar selects HTML básicos.

No dejar espacios descuidados.

No usar colores aleatorios.

Respetar estética dark/blue/naranja.

La app debe parecer una herramienta profesional de gestión para imprenta y plotter.

Debe sentirse como una evolución visual moderna de la pantalla de inventario existente de Blue CRM.

