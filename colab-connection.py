"""
Conexión a SQLite desde Google Colab/Jupyter Notebook
Para análisis de datos del dashboard de Subway
"""

import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go

# Configuración de estilo
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class SubwayDataAnalyzer:
    def __init__(self, db_path):
        """
        Inicializar conexión a la base de datos SQLite
        
        Args:
            db_path (str): Ruta al archivo de base de datos SQLite
        """
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        print(f"✅ Conectado a la base de datos: {db_path}")
    
    def get_sales_summary(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Obtener resumen general de ventas
        
        Args:
            from_date (str): Fecha de inicio (YYYY-MM-DD)
            to_date (str): Fecha de fin (YYYY-MM-DD)
        
        Returns:
            dict: Resumen de ventas
        """
        query = """
        SELECT 
            COUNT(DISTINCT so.linisco_id) as total_orders,
            COUNT(DISTINCT s.store_id) as total_stores,
            SUM(so.total - so.discount) as total_revenue,
            AVG(so.total - so.discount) as avg_order_value,
            COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        """
        
        result = pd.read_sql_query(query, self.conn, params=[from_date, to_date])
        return result.iloc[0].to_dict()
    
    def get_payment_breakdown(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Obtener desglose por métodos de pago con categorización
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        
        Returns:
            pd.DataFrame: Desglose por métodos de pago
        """
        query = """
        SELECT 
            CASE 
                WHEN so.payment_method = 'cash' OR so.payment_method = 'cc_pedidosyaft' THEN 'Efectivo'
                WHEN so.payment_method = 'cc_rappiol' OR so.payment_method = 'cc_pedidosyaol' THEN 'Apps'
                ELSE 'Otros'
            END as payment_category,
            COUNT(*) as order_count,
            SUM(so.total - so.discount) as total_amount
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        GROUP BY 
            CASE 
                WHEN so.payment_method = 'cash' OR so.payment_method = 'cc_pedidosyaft' THEN 'Efectivo'
                WHEN so.payment_method = 'cc_rappiol' OR so.payment_method = 'cc_pedidosyaol' THEN 'Apps'
                ELSE 'Otros'
            END
        ORDER BY total_amount DESC
        """
        
        return pd.read_sql_query(query, self.conn, params=[from_date, to_date])
    
    def get_daily_sales(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Obtener ventas diarias
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        
        Returns:
            pd.DataFrame: Ventas diarias
        """
        query = """
        SELECT 
            DATE(so.order_date) as date,
            COUNT(DISTINCT so.linisco_id) as orders,
            SUM(so.total - so.discount) as revenue
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        GROUP BY DATE(so.order_date)
        ORDER BY date
        """
        
        df = pd.read_sql_query(query, self.conn, params=[from_date, to_date])
        df['date'] = pd.to_datetime(df['date'])
        return df
    
    def get_top_products(self, from_date='2025-01-01', to_date='2025-12-31', limit=10):
        """
        Obtener productos más vendidos
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
            limit (int): Número de productos a mostrar
        
        Returns:
            pd.DataFrame: Productos más vendidos
        """
        query = """
        SELECT
            sp.name,
            sp.fixed_name,
            s.store_name,
            s.store_id,
            COUNT(*) as times_sold,
            SUM(sp.quantity) as total_quantity,
            SUM(sp.sale_price * sp.quantity) as total_revenue,
            AVG(sp.sale_price) as avg_price
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
        JOIN stores s ON sp.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
        ORDER BY total_revenue DESC
        LIMIT ?
        """
        
        return pd.read_sql_query(query, self.conn, params=[from_date, to_date, limit])
    
    def get_store_performance(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Obtener rendimiento por tienda
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        
        Returns:
            pd.DataFrame: Rendimiento por tienda
        """
        query = """
        SELECT 
            s.store_id,
            s.store_name,
            COUNT(DISTINCT so.linisco_id) as order_count,
            SUM(so.total - so.discount) as revenue,
            AVG(so.total - so.discount) as avg_order_value
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        GROUP BY s.store_id, s.store_name
        ORDER BY revenue DESC
        """
        
        df = pd.read_sql_query(query, self.conn, params=[from_date, to_date])
        
        # Calcular porcentajes
        total_revenue = df['revenue'].sum()
        df['percentage'] = (df['revenue'] / total_revenue) * 100
        
        return df
    
    def plot_payment_breakdown(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Crear gráfico de desglose por métodos de pago
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        """
        df = self.get_payment_breakdown(from_date, to_date)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Gráfico de barras
        bars = ax1.bar(df['payment_category'], df['total_amount'], 
                      color=['#FF6B6B', '#4ECDC4', '#45B7D1'])
        ax1.set_title('Ingresos por Método de Pago', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Ingresos ($)')
        ax1.tick_params(axis='x', rotation=45)
        
        # Agregar valores en las barras
        for bar, value in zip(bars, df['total_amount']):
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + value*0.01,
                    f'${value:,.0f}', ha='center', va='bottom', fontweight='bold')
        
        # Gráfico de torta
        colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']
        wedges, texts, autotexts = ax2.pie(df['total_amount'], labels=df['payment_category'], 
                                          autopct='%1.1f%%', colors=colors, startangle=90)
        ax2.set_title('Distribución por Método de Pago', fontsize=14, fontweight='bold')
        
        plt.tight_layout()
        plt.show()
        
        return df
    
    def plot_daily_sales(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Crear gráfico de ventas diarias
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        """
        df = self.get_daily_sales(from_date, to_date)
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        
        # Gráfico de ingresos
        ax1.plot(df['date'], df['revenue'], linewidth=2, color='#4ECDC4')
        ax1.fill_between(df['date'], df['revenue'], alpha=0.3, color='#4ECDC4')
        ax1.set_title('Ingresos Diarios', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Ingresos ($)')
        ax1.grid(True, alpha=0.3)
        
        # Gráfico de órdenes
        ax2.bar(df['date'], df['orders'], color='#FF6B6B', alpha=0.7)
        ax2.set_title('Órdenes Diarias', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Número de Órdenes')
        ax2.set_xlabel('Fecha')
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()
        
        return df
    
    def plot_store_performance(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Crear gráfico de rendimiento por tienda
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        """
        df = self.get_store_performance(from_date, to_date)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Gráfico de ingresos por tienda
        bars = ax1.barh(df['store_name'], df['revenue'], color='#45B7D1')
        ax1.set_title('Ingresos por Tienda', fontsize=14, fontweight='bold')
        ax1.set_xlabel('Ingresos ($)')
        
        # Agregar valores
        for i, (bar, value) in enumerate(zip(bars, df['revenue'])):
            ax1.text(bar.get_width() + value*0.01, bar.get_y() + bar.get_height()/2,
                    f'${value:,.0f}', va='center', fontweight='bold')
        
        # Gráfico de porcentajes
        colors = plt.cm.Set3(np.linspace(0, 1, len(df)))
        wedges, texts, autotexts = ax2.pie(df['revenue'], labels=df['store_name'], 
                                          autopct='%1.1f%%', colors=colors, startangle=90)
        ax2.set_title('Distribución por Tienda', fontsize=14, fontweight='bold')
        
        plt.tight_layout()
        plt.show()
        
        return df
    
    def generate_report(self, from_date='2025-01-01', to_date='2025-12-31'):
        """
        Generar reporte completo de análisis
        
        Args:
            from_date (str): Fecha de inicio
            to_date (str): Fecha de fin
        """
        print("=" * 60)
        print("📊 REPORTE DE ANÁLISIS DE VENTAS SUBWAY")
        print("=" * 60)
        
        # Resumen general
        summary = self.get_sales_summary(from_date, to_date)
        print(f"\n📈 RESUMEN GENERAL ({from_date} a {to_date})")
        print(f"• Total de órdenes: {summary['total_orders']:,}")
        print(f"• Total de tiendas: {summary['total_stores']}")
        print(f"• Ingresos totales: ${summary['total_revenue']:,.2f}")
        print(f"• Promedio por orden: ${summary['avg_order_value']:,.2f}")
        print(f"• Días con ventas: {summary['days_with_sales']}")
        
        # Desglose por métodos de pago
        print(f"\n💳 DESGLOSE POR MÉTODOS DE PAGO")
        payment_df = self.get_payment_breakdown(from_date, to_date)
        for _, row in payment_df.iterrows():
            print(f"• {row['payment_category']}: {row['order_count']:,} órdenes, ${row['total_amount']:,.2f}")
        
        # Top productos
        print(f"\n🏆 TOP 5 PRODUCTOS MÁS VENDIDOS")
        products_df = self.get_top_products(from_date, to_date, 5)
        for i, (_, row) in enumerate(products_df.iterrows(), 1):
            print(f"{i}. {row['name']}: {row['total_quantity']:,} unidades, ${row['total_revenue']:,.2f}")
        
        # Rendimiento por tienda
        print(f"\n🏪 RENDIMIENTO POR TIENDA")
        stores_df = self.get_store_performance(from_date, to_date)
        for _, row in stores_df.iterrows():
            print(f"• {row['store_name']}: {row['order_count']:,} órdenes, ${row['revenue']:,.2f} ({row['percentage']:.1f}%)")
        
        print("\n" + "=" * 60)
        print("✅ Reporte generado exitosamente")
        print("=" * 60)
    
    def close(self):
        """Cerrar conexión a la base de datos"""
        self.conn.close()
        print("🔒 Conexión cerrada")

# Ejemplo de uso
if __name__ == "__main__":
    # Ruta a tu base de datos SQLite
    db_path = "/path/to/your/linisco.db"  # Cambiar por la ruta real
    
    # Crear instancia del analizador
    analyzer = SubwayDataAnalyzer(db_path)
    
    # Generar reporte completo
    analyzer.generate_report()
    
    # Crear gráficos
    analyzer.plot_payment_breakdown()
    analyzer.plot_daily_sales()
    analyzer.plot_store_performance()
    
    # Cerrar conexión
    analyzer.close()
