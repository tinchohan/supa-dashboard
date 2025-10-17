# 📊 Análisis de Datos con Google Colab/Jupyter

Este documento explica cómo conectar la base de datos SQLite del dashboard de Subway con Google Colab o Jupyter Notebooks para realizar análisis avanzados de datos.

## 🚀 Configuración Inicial

### Para Google Colab:

1. **Subir el archivo de base de datos:**
   ```python
   from google.colab import files
   uploaded = files.upload()
   ```

2. **Instalar dependencias:**
   ```python
   !pip install pandas numpy matplotlib seaborn plotly
   ```

3. **Importar el analizador:**
   ```python
   from colab_connection import SubwayDataAnalyzer
   ```

### Para Jupyter Local:

1. **Instalar dependencias:**
   ```bash
   pip install pandas numpy matplotlib seaborn plotly
   ```

2. **Copiar archivos:**
   - Copia `colab_connection.py` a tu directorio de trabajo
   - Copia `linisco.db` a tu directorio de trabajo

## 📈 Uso Básico

```python
# Crear instancia del analizador
analyzer = SubwayDataAnalyzer("ruta/a/linisco.db")

# Generar reporte completo
analyzer.generate_report('2025-01-01', '2025-12-31')

# Crear gráficos
analyzer.plot_payment_breakdown()
analyzer.plot_daily_sales()
analyzer.plot_store_performance()

# Cerrar conexión
analyzer.close()
```

## 🔍 Funciones Disponibles

### 📊 Métodos de Análisis:

- `get_sales_summary()` - Resumen general de ventas
- `get_payment_breakdown()` - Desglose por métodos de pago
- `get_daily_sales()` - Ventas diarias
- `get_top_products()` - Productos más vendidos
- `get_store_performance()` - Rendimiento por tienda

### 📈 Métodos de Visualización:

- `plot_payment_breakdown()` - Gráfico de métodos de pago
- `plot_daily_sales()` - Gráfico de ventas diarias
- `plot_store_performance()` - Gráfico de rendimiento por tienda
- `generate_report()` - Reporte completo

## 🎯 Ejemplos de Análisis

### 1. Análisis de Métodos de Pago
```python
# Obtener datos
payment_df = analyzer.get_payment_breakdown('2025-01-01', '2025-12-31')
print(payment_df)

# Crear gráfico
analyzer.plot_payment_breakdown('2025-01-01', '2025-12-31')
```

### 2. Análisis de Productos
```python
# Top 10 productos
products = analyzer.get_top_products('2025-01-01', '2025-12-31', 10)
print(products)

# Gráfico personalizado
plt.figure(figsize=(12, 8))
top_10 = products.head(10)
bars = plt.barh(range(len(top_10)), top_10['total_revenue'])
plt.yticks(range(len(top_10)), top_10['name'])
plt.title('Top 10 Productos por Ingresos')
plt.show()
```

### 3. Análisis Temporal
```python
# Ventas diarias
daily_df = analyzer.get_daily_sales('2025-01-01', '2025-12-31')

# Gráfico interactivo con Plotly
import plotly.express as px
fig = px.line(daily_df, x='date', y='revenue', title='Ventas Diarias')
fig.show()
```

### 4. Consultas Personalizadas
```python
# Consulta SQL personalizada
query = """
SELECT 
    strftime('%Y-%m', so.order_date) as month,
    COUNT(*) as orders,
    SUM(so.total - so.discount) as revenue
FROM sale_orders so
WHERE DATE(so.order_date) BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY strftime('%Y-%m', so.order_date)
ORDER BY month
"""

monthly_df = pd.read_sql_query(query, analyzer.conn)
print(monthly_df)
```

## 📊 Categorización de Métodos de Pago

El sistema utiliza la siguiente categorización:

- **Efectivo**: `cash` + `cc_pedidosyaft`
- **Apps**: `cc_rappiol` + `cc_pedidosyaol`
- **Otros**: Todos los demás métodos de pago

## 🔧 Configuración Avanzada

### Personalizar Fechas:
```python
# Análisis de último mes
from datetime import datetime, timedelta
end_date = datetime.now().strftime('%Y-%m-%d')
start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

analyzer.generate_report(start_date, end_date)
```

### Filtros por Tienda:
```python
# Consulta con filtro de tienda
query = """
SELECT * FROM sale_orders 
WHERE store_id = '63953' 
AND DATE(order_date) BETWEEN '2025-01-01' AND '2025-12-31'
"""
filtered_df = pd.read_sql_query(query, analyzer.conn)
```

## 📁 Estructura de Archivos

```
proyecto/
├── colab_connection.py      # Clase principal del analizador
├── subway_analysis.ipynb    # Notebook de ejemplo
├── linisco.db              # Base de datos SQLite
└── COLAB_ANALYSIS.md       # Este archivo
```

## 🚨 Solución de Problemas

### Error de Conexión:
```python
# Verificar que el archivo existe
import os
print(os.path.exists("linisco.db"))
```

### Error de Dependencias:
```python
# Reinstalar dependencias
!pip install --upgrade pandas numpy matplotlib seaborn plotly
```

### Error de Permisos:
```python
# En Google Colab, verificar permisos
!ls -la /content/
```

## 📞 Soporte

Para problemas o preguntas:
1. Verificar que la base de datos esté accesible
2. Comprobar que todas las dependencias estén instaladas
3. Revisar los logs de error en la consola

## 🎉 ¡Listo para Analizar!

Con esta configuración puedes realizar análisis avanzados de los datos del dashboard de Subway, crear visualizaciones interactivas y generar reportes personalizados.
