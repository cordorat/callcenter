"""
Helper para gestión de estados del sistema.
Facilita el acceso a los TiposParametros sin hardcodear IDs.
"""
from django.core.cache import cache
from apps.users.models import TiposParametros


class EstadosHelper:
    """
    Helper para obtener estados del sistema por categoría y valor.
    Usa caché para optimizar las consultas.
    """
    
    CACHE_TIMEOUT = 3600  # 1 hora
    CACHE_PREFIX = 'estado_'
    
    # Categorías disponibles
    ROL_USUARIO = 'ROL_USUARIO'
    ESTADO_AGENTE = 'ESTADO_AGENTE'
    ESTADO_CAMPANA = 'ESTADO_CAMPANA'
    ESTADO_LLAMADA = 'ESTADO_LLAMADA'
    ESTADO_INTERACION_LLAMADA = 'ESTADO_INTERACION_LLAMADA'
    ESTADO_VENTA = 'ESTADO_VENTA'
    MOTIVO_RECHAZO = 'MOTIVO_RECHAZO'
    TIPO_LLAMADA = 'TIPO_LLAMADA'
    TIPO_CAMPANA = 'TIPO_CAMPANA'
    
    @classmethod
    def get_estado(cls, categoria, valor):
        """
        Obtiene un estado por categoría y valor.
        
        Args:
            categoria: Nombre de la categoría (ej: 'ESTADO_AGENTE')
            valor: Valor del estado (ej: 'DISPONIBLE')
            
        Returns:
            TiposParametros object o None si no existe
        """
        cache_key = f"{cls.CACHE_PREFIX}{categoria}_{valor}"
        
        # Intentar obtener del caché
        estado = cache.get(cache_key)
        
        if estado is None:
            try:
                estado = TiposParametros.objects.get(
                    nombre=categoria,
                    valor=valor
                )
                # Guardar en caché
                cache.set(cache_key, estado, cls.CACHE_TIMEOUT)
            except TiposParametros.DoesNotExist:
                return None
        
        return estado
    
    @classmethod
    def get_estado_id(cls, categoria, valor, default=None):
        """
        Obtiene el ID de un estado.
        
        Args:
            categoria: Nombre de la categoría
            valor: Valor del estado
            default: Valor por defecto si no existe
            
        Returns:
            ID del estado o default
        """
        estado = cls.get_estado(categoria, valor)
        return estado.parametros_id if estado else default
    
    @classmethod
    def get_estados_por_categoria(cls, categoria):
        """
        Obtiene todos los estados de una categoría.
        
        Args:
            categoria: Nombre de la categoría
            
        Returns:
            QuerySet de TiposParametros
        """
        cache_key = f"{cls.CACHE_PREFIX}cat_{categoria}"
        
        estados = cache.get(cache_key)
        
        if estados is None:
            estados = list(TiposParametros.objects.filter(nombre=categoria))
            cache.set(cache_key, estados, cls.CACHE_TIMEOUT)
        
        return estados
    
    @classmethod
    def limpiar_cache(cls):
        """Limpia el caché de estados."""
        # Django no tiene forma directa de limpiar por prefijo,
        # pero podemos invalidar manualmente
        pass
    
    # ============================================================
    # Métodos de conveniencia para estados comunes
    # ============================================================
    
    @classmethod
    def agente_disponible(cls):
        """Retorna el estado DISPONIBLE para agentes."""
        return cls.get_estado(cls.ESTADO_AGENTE, 'DISPONIBLE')
    
    @classmethod
    def agente_en_llamada(cls):
        """Retorna el estado EN_LLAMADA para agentes."""
        return cls.get_estado(cls.ESTADO_AGENTE, 'EN_LLAMADA')
    
    @classmethod
    def agente_postcall(cls):
        """Retorna el estado POSTCALL para agentes."""
        return cls.get_estado(cls.ESTADO_AGENTE, 'AFTERCALL')
    
    @classmethod
    def agente_desconectado(cls):
        """Retorna el estado DESCONECTADO para agentes."""
        return cls.get_estado(cls.ESTADO_AGENTE, 'DESCONECTADO')
    
    @classmethod
    def llamada_timbrado(cls):
        """Retorna el estado TIMBRADO para llamadas."""
        return cls.get_estado(cls.ESTADO_LLAMADA, 'TIMBRADO')
    
    @classmethod
    def llamada_en_curso(cls):
        """Retorna el estado EN_CURSO para llamadas."""
        return cls.get_estado(cls.ESTADO_LLAMADA, 'EN_CURSO')
    
    @classmethod
    def llamada_completada(cls):
        """Retorna el estado COMPLETADA para llamadas."""
        return cls.get_estado(cls.ESTADO_LLAMADA, 'COMPLETADA')
    
    @classmethod
    def llamada_rechazada(cls):
        """Retorna el estado RECHAZADA para llamadas."""
        return cls.get_estado(cls.ESTADO_LLAMADA, 'RECHAZADA')
    
    @classmethod
    def venta_realizada(cls):
        """Retorna el estado VENTA para ventas."""
        return cls.get_estado(cls.ESTADO_VENTA, 'VENTA')
    
    @classmethod
    def venta_no_realizada(cls):
        """Retorna el estado NO_VENTA para ventas."""
        return cls.get_estado(cls.ESTADO_VENTA, 'NO_VENTA')
    
    @classmethod
    def venta_pendiente(cls):
        """Retorna el estado PENDIENTE para ventas."""
        return cls.get_estado(cls.ESTADO_VENTA, 'PENDIENTE')
    
    @classmethod
    def interacion_contactado(cls):
        """Retorna el estado CONTACTADO para iteraciones."""
        return cls.get_estado(cls.ESTADO_INTERACION_LLAMADA, 'CONTACTADO')
    
    @classmethod
    def interacion_no_contactado(cls):
        """Retorna el estado NO_CONTACTADO para iteraciones."""
        return cls.get_estado(cls.ESTADO_INTERACION_LLAMADA, 'NO_CONTACTADO')
    
    @classmethod
    def campana_activa(cls):
        """Retorna el estado ACTIVA para campañas."""
        return cls.get_estado(cls.ESTADO_CAMPANA, 'ACTIVA')


# Instancia global para uso directo
estados = EstadosHelper()


# Función de conveniencia
def get_estado(categoria, valor):
    """
    Función de conveniencia para obtener un estado.
    
    Uso:
        from apps.common.estados_helper import get_estado
        estado = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
    """
    return EstadosHelper.get_estado(categoria, valor)


def get_estado_id(categoria, valor, default=None):
    """
    Función de conveniencia para obtener el ID de un estado.
    
    Uso:
        from apps.common.estados_helper import get_estado_id
        estado_id = get_estado_id('ESTADO_AGENTE', 'DISPONIBLE')
    """
    return EstadosHelper.get_estado_id(categoria, valor, default)
