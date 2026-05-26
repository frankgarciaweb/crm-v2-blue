# PROMPT MAESTRO — LÓGICA, FUNCIONES Y BASE DE DATOS DE BLUE CRM (`crm.biombos.cl`)

## 0. Uso de este documento

Este documento es un **prompt maestro funcional y técnico** para reconstruir `crm.biombos.cl`, también llamado **Blue CRM / Blue Impresión**.

Debe usarse con una IA de desarrollo como Codex, Claude Code, Cursor, Aider, OpenCode, Qwen Coder u otro asistente de programación.

El objetivo es reconstruir la app respetando la lógica real del sistema anterior, basada en la estructura de Supabase y en el flujo operacional de una empresa de impresión/plotter.

No construir un CRM genérico.

---

# 1. Descripción general del sistema

`crm.biombos.cl` es una aplicación interna llamada **Blue CRM** para gestionar una empresa de impresión, plotter y productos gráficos.

El sistema combina:

- CRM de clientes
- cotizaciones
- pedidos
- pedidos PDF
- archivos de trabajo
- trabajos de producción
- productos
- catálogo
- inventario de materiales
- inventario de tintas
- consumo de materiales
- consumo de tintas CMYK por pedido/trabajo
- máquinas de impresión
- perfiles de tinta
- compras y proveedores
- solicitudes de compra
- caja y finanzas
- configuración del negocio
- precios, márgenes, tasa dólar/Binance

La app debe reconstruirse como un sistema operacional conectado, no como módulos aislados.

---

# 2. Tablas reales detectadas en Supabase

La base de datos pública contiene 36 tablas y 405 columnas.

## Tablas principales

```text
catalog_items
clientes
compra_items
compras_material
compras_proveedores
configuracion_negocio
consumo_materiales
consumo_tinta_pedido
cotizacion_items
cotizaciones
dolar
historial_binance
historial_precios
historial_tasa_binance
inventario_bajo
maquina_tinta_activa
maquinas
marcas_tinta
materiales
movimientos_caja
pedido_items
pedidos
pedidos_completos
producto_perfil_tinta
productos
productos_completos
productos_materiales
productos_materiales_consumo
proveedores
quote_items
quotes
solicitud_items
solicitudes_compra
tintas
trabajos
trabajos_completos
```

---

# 3. Arquitectura funcional general

La app debe organizarse en estos módulos:

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

El flujo principal es:

```text
Cliente
↓
Cotización
↓
Pedido
↓
Trabajo de producción
↓
Consumo de material + consumo de tinta
↓
Movimiento financiero
↓
Cierre / entrega / historial
```

---

# 4. Clientes

## Tabla principal

`clientes`

Columnas:

```text
id
nombre_completo
cedula_rif
telefono
email
direccion
created_at
updated_at
porcentaje_descuento
activo
```

## Función del módulo

Administrar clientes y su relación con cotizaciones, pedidos, pagos y descuentos.

## Lógica clave

Cada cliente puede tener un `porcentaje_descuento`. Este descuento debe poder aplicarse en cotizaciones o pedidos según la regla comercial.

## Funciones requeridas

- crear cliente
- editar cliente
- activar/desactivar cliente
- buscar por nombre, teléfono, cédula/RIF o email
- ver cotizaciones del cliente
- ver pedidos del cliente
- ver pagos o saldo relacionado
- aplicar descuento personalizado

## Reglas

- No borrar clientes con historial; usar `activo=false`.
- El descuento del cliente debe ser visible al cotizar.
- Si el cliente tiene descuento, mostrar advertencia o badge.

---

# 5. Cotizaciones

Existen dos estructuras en la base:

```text
cotizaciones / cotizacion_items
quotes / quote_items
```

El sistema reconstruido debe unificar visualmente la experiencia de cotización, aunque internamente se respete la estructura existente o se migre de forma controlada.

## 5.1. Tabla `cotizaciones`

Columnas:

```text
id
cliente_id
nombre
margen_ganancia
iva_percent
subtotal
total_precio
estado
notas
created_at
updated_at
```

## 5.2. Tabla `cotizacion_items`

Columnas:

```text
id
cotizacion_id
descripcion
cantidad
precio_unitario
line_total
created_at
```

## 5.3. Tabla `quotes`

Columnas:

```text
id
cliente_id
name
width_cm
height_cm
subtotal_cost
profit_margin
tax_percent
total_price
status
notas
pedido_id
created_at
updated_at
items_data
numero
```

## 5.4. Tabla `quote_items`

Columnas:

```text
id
quote_id
catalog_item_id
calc_rule
quantity
unit_cost
waste_percent
line_total
sort_order
item_name
```

## Funciones requeridas

- crear cotización
- editar cotización
- agregar múltiples ítems
- calcular subtotal
- aplicar margen
- aplicar impuesto/IVA
- aplicar descuento de cliente si corresponde
- calcular total
- cambiar estado
- convertir a pedido
- asociar cotización a cliente
- mantener historial

## Estados sugeridos

```text
borrador
enviada
aceptada
rechazada
vencida
convertida
```

## Reglas de cálculo

```text
subtotal = suma de line_total
margen = subtotal * profit_margin o margen_ganancia
tax/iva = base * tax_percent
total = subtotal + margen + impuesto - descuentos
```

Si el cliente tiene `porcentaje_descuento`, debe mostrarse y poder aplicarse con confirmación.

---

# 6. Pedidos

## Tabla principal

`pedidos`

Columnas importantes:

```text
id
cliente_id
material_id
alto
ancho
metros_cuadrados
maquina_usar
precio_total
notas
prioridad
estado
archivo_trabajo_url
created_at
updated_at
producto_id
metodo_pago
referencia_pago
comprobante_url
monto_pagado
fecha_limite
pdf_url
grupo_pedido_id
costo_material
costo_tinta
costo_overhead
costo_maquina
costo_total
ganancia_bruta
margen_real
tipo_pago
abono
dias_credito
```

## Tabla `pedido_items`

```text
id
pedido_id
producto_id
alto
ancho
metros_cuadrados
precio_unitario
precio_total
notas
created_at
cantidad
```

## Vista `pedidos_completos`

Incluye datos unidos:

```text
cliente_nombre
cliente_cedula
cliente_telefono
material_tipo
material_ancho
```

## Función del módulo

Gestionar ventas aceptadas y trabajos reales.

## Estados sugeridos

```text
pendiente
confirmado
en producción
en revisión
listo
entregado
cancelado
```

## Prioridad

```text
baja
normal
alta
urgente
```

## Lógica de pedido

Un pedido puede estar vinculado a:

- cliente
- producto
- material
- máquina
- archivo de trabajo
- comprobante
- PDF
- trabajos de producción
- consumo de material
- consumo de tinta
- movimiento de caja

## Cálculo financiero por pedido

El pedido debe calcular:

```text
costo_total = costo_material + costo_tinta + costo_overhead + costo_maquina
ganancia_bruta = precio_total - costo_total
margen_real = ganancia_bruta / precio_total * 100
saldo = precio_total - monto_pagado o precio_total - abono
```

Debe permitir:

- pago total
- abono
- crédito con días de crédito
- referencia de pago
- comprobante de pago

---

# 7. Trabajos de producción

## Tabla `trabajos`

Columnas:

```text
id
pedido_id
descripcion
metros_cuadrados
material_tipo
maquina_asignada
prioridad
estado
fecha_estimada
created_at
updated_at
```

## Vista `trabajos_completos`

Incluye:

```text
pedido_id
pedido_precio
cliente_nombre
```

## Función

Representa la parte productiva de un pedido.

Un pedido puede generar uno o más trabajos.

## Estados sugeridos

```text
pendiente
programado
en producción
pausado
completado
cancelado
```

## Relación con otros módulos

Trabajo se conecta con:

- pedido
- cliente vía pedido
- material
- máquina
- consumo de tinta
- consumo de material

---

# 8. Productos y catálogo

## Tabla `productos`

Columnas:

```text
id
nombre
descripcion
precio_m2
es_kit
activo
created_at
updated_at
costo_materiales_estimado_m2
costo_tinta_m2
costo_mo_m2
margen_ganancia_porcentaje
tipo_cobro
precio_mercado_referencia
maquina_id
perfil_tinta_id
categoria
```

## Tabla `catalog_items`

Columnas:

```text
id
name
category
unit
calc_rule
unit_cost
waste_percent
description
activo
created_at
```

## Función del módulo

Configurar productos y servicios vendibles.

Un producto define:

- precio base
- forma de cobro
- costos estimados
- margen
- máquina asociada
- perfil de tinta
- materiales necesarios

## Tipo de cobro

Posibles tipos:

```text
por_m2
por_unidad
por_servicio
por_kit
manual
```

## Reglas

- No hardcodear precios importantes en código.
- Los productos deben ser editables desde la app.
- Productos inactivos no deben aparecer como opción principal, pero no deben borrarse si tienen historial.

---

# 9. Materiales

## Tabla `materiales`

Columnas:

```text
id
tipo
ancho
largo_original
largo_restante
proveedor
fecha_ingreso
precio_m2
stock
porcentaje
created_at
updated_at
precio_fuente
precio_actualizado_en
unidad_medida
cantidad_actual
cantidad_minima
precio_unitario
```

## Función

Gestionar materiales físicos usados en producción.

## Lógica de stock

Puede manejar:

- rollos por ancho/largo
- cantidad actual
- cantidad mínima
- precio por m²
- precio unitario
- proveedor
- stock bajo

## Stock bajo

Si `cantidad_actual <= cantidad_minima`, o si `largo_restante` cae bajo umbral, se debe marcar como stock bajo.

---

# 10. Consumo de materiales

## Tabla `consumo_materiales`

Columnas:

```text
id
pedido_id
material_id
cantidad_consumida
created_at
```

## Función

Registrar consumo real o estimado de material por pedido.

## Reglas

Al producir o cerrar un pedido se debe registrar consumo:

```text
pedido_id
material_id
cantidad_consumida
fecha
```

La app debe distinguir:

- material estimado
- material consumido
- ajuste manual

Si se descuenta stock, debe actualizar `materiales.cantidad_actual`, `stock` o `largo_restante` según unidad usada.

---

# 11. Tintas

## Tabla `tintas`

Columnas:

```text
id
nombre
maquina
cantidad
minimo
unidad
porcentaje
created_at
updated_at
marca
color
magenta_cantidad
cian_cantidad
amarillo_cantidad
negro_cantidad
magenta_minimo
cian_minimo
amarillo_minimo
negro_minimo
costo_por_cc
costo_fuente
costo_actualizado_en
proveedor
```

## Tabla `marcas_tinta`

```text
id
nombre
created_at
```

## Función

Controlar tintas por máquina, marca, color y cantidades CMYK.

## Lógica

La app debe permitir:

- registrar tinta general
- registrar cantidades por color
- controlar mínimos por color
- calcular porcentaje restante
- calcular costo por cc
- asociar proveedor
- detectar stock bajo

---

# 12. Consumo de tinta por pedido

## Tabla `consumo_tinta_pedido`

Columnas:

```text
id
pedido_id
tinta_id
magenta_consumida
cian_consumida
amarillo_consumida
negro_consumida
created_at
updated_at
trabajo_id
producto_descripcion
metros_cuadrados
```

## Función

Registrar consumo CMYK por pedido o trabajo.

## Lógica

El consumo puede calcularse usando:

- metros cuadrados del pedido/trabajo
- perfil de tinta del producto
- máquina usada
- valores cc/m² por color

Fórmula conceptual:

```text
consumo_cian = metros_cuadrados * cian_cc_m2
consumo_magenta = metros_cuadrados * magenta_cc_m2
consumo_amarillo = metros_cuadrados * amarillo_cc_m2
consumo_negro = metros_cuadrados * negro_cc_m2
```

Debe quedar vinculado a:

- pedido
- trabajo
- tinta
- producto
- m²

---

# 13. Perfiles de tinta

## Tabla `producto_perfil_tinta`

Columnas:

```text
id
producto_id
nombre
cian_cc_m2
magenta_cc_m2
amarillo_cc_m2
negro_cc_m2
es_default
created_at
```

## Función

Definir cuánto consume un producto por m² en CMYK.

Ejemplo:

```text
Producto: Vinil impreso alta calidad
Perfil: Calidad estándar
Cian: 0.8 cc/m²
Magenta: 0.7 cc/m²
Amarillo: 0.6 cc/m²
Negro: 0.5 cc/m²
```

Debe permitir múltiples perfiles y marcar uno como default.

---

# 14. Productos y materiales asociados

## Tabla `productos_materiales`

Columnas:

```text
id
producto_id
material_id
cantidad_por_m2
created_at
updated_at
tipo_calculo
```

## Tabla `productos_materiales_consumo`

Columnas:

```text
id
producto_id
material_id
unidad_consumo
regla_consumo_formula
created_at
updated_at
```

## Función

Definir qué materiales consume cada producto.

## Ejemplos

Producto: Sticker vinil

```text
material: vinil adhesivo
cantidad_por_m2: 1
unidad_consumo: m²
regla_consumo_formula: ancho * alto * cantidad + merma
```

Producto: Pendón

```text
material: lona
cantidad_por_m2: 1
unidad_consumo: m²
regla_consumo_formula: m² + margen de terminación
```

---

# 15. Máquinas

## Tabla `maquinas`

Columnas:

```text
id
nombre
marca
modelo
costo_adquisicion_usd
meses_depreciacion
costo_depreciacion_mes
velocidad_calidad_m2h
velocidad_produccion_m2h
velocidad_draft_m2h
activa
notas
created_at
estado
ancho_maximo
es_tercero
```

## Función

Administrar máquinas propias o de terceros.

## Lógica

La máquina afecta:

- ancho máximo
- velocidad de producción
- tiempo estimado
- costo máquina
- depreciación mensual
- disponibilidad

## Costo máquina conceptual

```text
costo_hora_maquina = costo_depreciacion_mes / horas_productivas_mes
costo_maquina_pedido = horas_estimadas * costo_hora_maquina
```

## Tiempo estimado

```text
tiempo_horas = metros_cuadrados / velocidad_m2h
```

Según modo:

```text
calidad
producción
draft
```

---

# 16. Máquina y tinta activa

## Tabla `maquina_tinta_activa`

Columnas:

```text
id
maquina_id
tinta_id
activo
fecha_asignacion
notas
created_at
updated_at
```

## Función

Definir qué tinta está activa en qué máquina.

Regla:

- una máquina puede tener una o varias tintas asignadas
- solo tintas activas deben usarse para cálculos actuales

---

# 17. Inventario bajo

## Tabla `inventario_bajo`

Columnas:

```text
id
nombre
maquina
cantidad
minimo
unidad
porcentaje
created_at
updated_at
```

## Función

Vista o tabla para alertas de stock bajo.

Debe alimentar:

- dashboard
- módulo inventario
- compras sugeridas

---

# 18. Compras y proveedores

## Tabla `proveedores`

Columnas:

```text
id
nombre
rif
telefono
email
direccion
contacto_principal
cuenta_por_pagar
created_at
updated_at
moneda
credito
dias_credito
```

## Tabla `compras_proveedores`

Columnas:

```text
id
proveedor_id
numero_factura
fecha_factura
monto_total
monto_pagado
estado
descripcion
archivo_factura_url
created_at
updated_at
moneda
```

## Tabla `compra_items`

Columnas:

```text
id
compra_id
tipo
item_id
tinta_color
descripcion
cantidad
unidad
precio_unitario
total_linea
created_at
```

## Tabla `compras_material`

Columnas:

```text
id
material_id
cantidad
unidad
moneda
precio_moneda
tasa_usd
precio_usd
proveedor
es_credito
estado_pago
fecha_compra
fecha_pago
nota
created_at
```

## Función

Administrar proveedores, compras y cuentas por pagar.

## Reglas

- una compra puede tener varios items
- una compra puede estar pagada, parcial o pendiente
- una compra puede tener moneda local o USD
- si es crédito, usar días de crédito y fecha de pago/vencimiento
- compras de materiales pueden actualizar inventario

---

# 19. Solicitudes de compra

## Tabla `solicitudes_compra`

Columnas:

```text
id
solicitante
estado
fecha_necesidad
notas
created_at
updated_at
compra_notas
estado_pago
fecha_vencimiento
```

## Tabla `solicitud_items`

Columnas:

```text
id
solicitud_id
tipo
item_id
cantidad
unidad
descripcion
created_at
datos_json
precio_total
precio_unitario
proveedor_id
numero_factura
fecha_compra
```

## Función

Permitir solicitar compra de materiales, tintas u otros insumos antes de crear una compra formal.

Estados sugeridos:

```text
solicitada
aprobada
comprada
recibida
cancelada
```

---

# 20. Finanzas y caja

## Tabla `movimientos_caja`

Columnas:

```text
id
tipo
monto
concepto
metodo_pago
referencia
pedido_id
fecha
created_at
```

## Función

Registrar ingresos y egresos.

Tipos:

```text
ingreso
egreso
ajuste
abono
pago proveedor
```

## Relación con pedidos

Un movimiento puede estar asociado a `pedido_id`.

Cuando se registra pago de un pedido:

- actualizar monto pagado o abono
- crear movimiento de caja
- actualizar estado de pago si se implementa

---

# 21. Configuración del negocio

## Tabla `configuracion_negocio`

Columnas:

```text
id
gastos_fijos
total_gastos_fijos_mes
produccion_estimada_m2_mes
margen_default
moneda
updated_at
```

## Función

Guardar parámetros globales.

## Uso

Debe alimentar cálculos:

```text
costo_overhead_m2 = total_gastos_fijos_mes / produccion_estimada_m2_mes
margen_default para productos/cotizaciones
moneda base
```

---

# 22. Tasa dólar / Binance

Tablas:

```text
dolar
historial_binance
historial_tasa_binance
```

Columnas relevantes:

```text
valor
uero
binace
fecha
tasa_bs
fuente
```

## Función

Mantener tasas de referencia para precios, compras y costos.

Debe mostrarse en topbar o configuración.

---

# 23. Historial de precios

## Tabla `historial_precios`

Columnas:

```text
id
entidad_tipo
entidad_id
entidad_nombre
precio_anterior
precio_nuevo
fuente
nota
created_at
```

## Función

Registrar cambios de precios en productos, materiales, tintas u otros.

Regla:

Cuando cambia un precio relevante, registrar histórico.

---

# 24. Pedidos PDF y archivos

Campos asociados:

```text
pedidos.pdf_url
pedidos.archivo_trabajo_url
pedidos.comprobante_url
compras_proveedores.archivo_factura_url
```

## Función

Gestionar documentos asociados.

Debe permitir:

- subir archivo de trabajo
- asociar PDF de pedido
- asociar comprobante de pago
- asociar factura de proveedor
- visualizar/descargar archivos

---

# 25. Módulo Plotter

El módulo Plotter debe usar:

- `pedidos.alto`
- `pedidos.ancho`
- `pedidos.metros_cuadrados`
- `pedidos.maquina_usar`
- `productos.precio_m2`
- `materiales.ancho`
- `materiales.precio_m2`
- `maquinas.ancho_maximo`
- `maquinas.velocidad_*_m2h`
- `producto_perfil_tinta`
- `productos_materiales`

## Cálculos mínimos

```text
metros_cuadrados = (alto * ancho) / 10000 si alto/ancho están en cm
precio_base = metros_cuadrados * producto.precio_m2
costo_material = metros_cuadrados * material.precio_m2
costo_tinta = suma(consumo_color_cc * costo_por_cc)
costo_maquina = tiempo_horas * costo_hora_maquina
costo_total = costo_material + costo_tinta + costo_maquina + costo_overhead
precio_sugerido = costo_total * (1 + margen / 100)
```

## Debe considerar

- medidas en cm
- conversión a m²
- cantidad
- ancho máximo de máquina/material
- merma si aplica
- cálculo editable manualmente

---

# 26. Dashboard

Debe reunir datos de:

- pedidos activos
- ventas del mes
- cotizaciones pendientes
- trabajos en producción
- stock bajo
- tinta baja
- cuentas por cobrar
- cuentas por pagar
- compras pendientes
- productividad m²

Cards sugeridas:

```text
Ventas del mes
Pedidos activos
Trabajos pendientes
Cotizaciones abiertas
Stock bajo materiales
Stock bajo tintas
Por cobrar
Por pagar
```

---

# 27. Reglas de seguridad y datos

- No borrar registros con historial; usar estados o `activo=false`.
- No exponer credenciales en frontend.
- No hardcodear precios de negocio.
- No asumir que vistas como `pedidos_completos` son editables.
- Preservar relaciones con foreign keys.
- Toda operación crítica debe tener confirmación.
- Mantener historial de precios y movimientos.

---

# 28. Relaciones principales detectadas

Relaciones clave:

```text
pedidos.cliente_id -> clientes.id
pedidos.producto_id -> productos.id
pedidos.material_id -> materiales.id
pedido_items.pedido_id -> pedidos.id
pedido_items.producto_id -> productos.id
trabajos.pedido_id -> pedidos.id
consumo_materiales.pedido_id -> pedidos.id
consumo_materiales.material_id -> materiales.id
consumo_tinta_pedido.pedido_id -> pedidos.id
consumo_tinta_pedido.tinta_id -> tintas.id
consumo_tinta_pedido.trabajo_id -> trabajos.id
cotizaciones.cliente_id -> clientes.id
cotizacion_items.cotizacion_id -> cotizaciones.id
quotes.cliente_id -> clientes.id
quotes.pedido_id -> pedidos.id
quote_items.quote_id -> quotes.id
quote_items.catalog_item_id -> catalog_items.id
productos.maquina_id -> maquinas.id
productos.perfil_tinta_id -> producto_perfil_tinta.id
producto_perfil_tinta.producto_id -> productos.id
productos_materiales.producto_id -> productos.id
productos_materiales.material_id -> materiales.id
productos_materiales_consumo.producto_id -> productos.id
productos_materiales_consumo.material_id -> materiales.id
maquina_tinta_activa.maquina_id -> maquinas.id
maquina_tinta_activa.tinta_id -> tintas.id
compras_proveedores.proveedor_id -> proveedores.id
compra_items.compra_id -> compras_proveedores.id
compras_material.material_id -> materiales.id
movimientos_caja.pedido_id -> pedidos.id
solicitud_items.solicitud_id -> solicitudes_compra.id
```

---

# 29. Orden recomendado de reconstrucción

Reconstruir en este orden:

```text
1. Layout base + navegación
2. Dashboard
3. Clientes
4. Productos
5. Materiales/Tintas/Inventario
6. Pedidos
7. Trabajos
8. Cotizaciones
9. Finanzas / movimientos de caja
10. Proveedores / compras
11. Plotter / calculadoras
12. Pedidos PDF / archivos
13. Configuración
14. Reportes e historial
```

Prioridad funcional:

```text
clientes → productos/materiales/tintas → pedidos → consumo → finanzas
```

---

# 30. Resultado esperado

La app reconstruida debe permitir:

- crear clientes
- crear productos
- configurar materiales/tintas/máquinas
- cotizar
- convertir cotización en pedido
- calcular m²
- asignar máquina/material/producto
- registrar consumo de material
- registrar consumo CMYK
- calcular costos y margen real
- registrar pagos
- registrar compras/proveedores
- ver stock bajo
- ver dashboard financiero/operativo

Debe mantener la lógica real de Blue CRM y no simplificarse a un CRM genérico.

