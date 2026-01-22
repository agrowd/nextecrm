#!/bin/bash

# Script de rotación de IPs para GMaps Leads Scraper
# Usa WireGuard para cambiar la IP pública automáticamente

# Configuración
WG_INTERFACE=${WG_INTERFACE:-"wg0"}
PEERS_DIR=${PEERS_DIR:-"./peers"}
CURRENT_PEER_FILE="/tmp/current_peer"
LOG_FILE="/var/log/wg-rotate.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar si WireGuard está instalado
check_wireguard() {
    if ! command -v wg &> /dev/null; then
        error "WireGuard no está instalado. Instálalo primero:"
        echo "Ubuntu/Debian: sudo apt install wireguard"
        echo "CentOS/RHEL: sudo yum install wireguard-tools"
        exit 1
    fi
}

# Verificar si el script se ejecuta como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script debe ejecutarse como root (sudo)"
        exit 1
    fi
}

# Obtener la IP actual
get_current_ip() {
    curl -s --max-time 10 https://ipinfo.io/ip 2>/dev/null || echo "unknown"
}

# Listar peers disponibles
list_peers() {
    if [[ ! -d "$PEERS_DIR" ]]; then
        error "Directorio de peers no encontrado: $PEERS_DIR"
        exit 1
    fi
    
    local peers=()
    while IFS= read -r -d '' file; do
        peers+=("$(basename "$file" .conf)")
    done < <(find "$PEERS_DIR" -name "*.conf" -print0)
    
    echo "${peers[@]}"
}

# Obtener siguiente peer
get_next_peer() {
    local peers=($(list_peers))
    local current_peer=""
    
    if [[ -f "$CURRENT_PEER_FILE" ]]; then
        current_peer=$(cat "$CURRENT_PEER_FILE")
    fi
    
    # Encontrar el índice del peer actual
    local current_index=-1
    for i in "${!peers[@]}"; do
        if [[ "${peers[$i]}" == "$current_peer" ]]; then
            current_index=$i
            break
        fi
    done
    
    # Obtener el siguiente peer (rotación circular)
    local next_index=$(( (current_index + 1) % ${#peers[@]} ))
    echo "${peers[$next_index]}"
}

# Desconectar WireGuard
disconnect_wg() {
    log "Desconectando WireGuard..."
    if wg show "$WG_INTERFACE" &>/dev/null; then
        wg-quick down "$WG_INTERFACE" 2>/dev/null
        sleep 2
    fi
}

# Conectar a un peer específico
connect_to_peer() {
    local peer_name="$1"
    local peer_config="$PEERS_DIR/${peer_name}.conf"
    
    if [[ ! -f "$peer_config" ]]; then
        error "Configuración de peer no encontrada: $peer_config"
        return 1
    fi
    
    log "Conectando a peer: $peer_name"
    
    # Copiar configuración temporal
    cp "$peer_config" "/etc/wireguard/${WG_INTERFACE}.conf"
    
    # Iniciar WireGuard
    if wg-quick up "$WG_INTERFACE"; then
        success "Conectado a peer: $peer_name"
        echo "$peer_name" > "$CURRENT_PEER_FILE"
        return 0
    else
        error "Error conectando a peer: $peer_name"
        return 1
    fi
}

# Verificar conectividad
check_connectivity() {
    local max_attempts=5
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Verificando conectividad (intento $attempt/$max_attempts)..."
        
        local new_ip=$(get_current_ip)
        if [[ "$new_ip" != "unknown" && "$new_ip" != "$1" ]]; then
            success "IP cambiada exitosamente: $1 -> $new_ip"
            return 0
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            warning "Esperando 10 segundos antes del siguiente intento..."
            sleep 10
        fi
        
        ((attempt++))
    done
    
    error "No se pudo verificar el cambio de IP después de $max_attempts intentos"
    return 1
}

# Función principal de rotación
rotate_ip() {
    log "Iniciando rotación de IP..."
    
    # Verificar dependencias
    check_wireguard
    check_root
    
    # Obtener IP actual
    local old_ip=$(get_current_ip)
    log "IP actual: $old_ip"
    
    # Obtener siguiente peer
    local next_peer=$(get_next_peer)
    if [[ -z "$next_peer" ]]; then
        error "No se encontraron peers disponibles"
        exit 1
    fi
    
    log "Rotando a peer: $next_peer"
    
    # Desconectar actual
    disconnect_wg
    
    # Conectar al nuevo peer
    if connect_to_peer "$next_peer"; then
        # Verificar que la IP cambió
        if check_connectivity "$old_ip"; then
            success "Rotación completada exitosamente"
            return 0
        else
            warning "Rotación completada pero no se pudo verificar el cambio de IP"
            return 0
        fi
    else
        error "Error en la rotación"
        return 1
    fi
}

# Función para mostrar estado
show_status() {
    log "Estado actual de WireGuard:"
    
    if wg show "$WG_INTERFACE" &>/dev/null; then
        success "WireGuard está activo"
        wg show "$WG_INTERFACE"
        
        if [[ -f "$CURRENT_PEER_FILE" ]]; then
            local current_peer=$(cat "$CURRENT_PEER_FILE")
            log "Peer actual: $current_peer"
        fi
        
        local current_ip=$(get_current_ip)
        log "IP actual: $current_ip"
    else
        warning "WireGuard no está activo"
    fi
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: $0 [COMANDO]"
    echo ""
    echo "Comandos:"
    echo "  rotate    - Rotar a la siguiente IP"
    echo "  status    - Mostrar estado actual"
    echo "  list      - Listar peers disponibles"
    echo "  help      - Mostrar esta ayuda"
    echo ""
    echo "Variables de entorno:"
    echo "  WG_INTERFACE - Interfaz WireGuard (default: wg0)"
    echo "  PEERS_DIR    - Directorio de peers (default: ./peers)"
    echo ""
    echo "Ejemplo:"
    echo "  sudo $0 rotate"
}

# Función para listar peers
list_peers_cmd() {
    log "Peers disponibles:"
    local peers=($(list_peers))
    
    if [[ ${#peers[@]} -eq 0 ]]; then
        warning "No se encontraron peers"
        return
    fi
    
    for peer in "${peers[@]}"; do
        local current_peer=""
        if [[ -f "$CURRENT_PEER_FILE" ]]; then
            current_peer=$(cat "$CURRENT_PEER_FILE")
        fi
        
        if [[ "$peer" == "$current_peer" ]]; then
            echo -e "  ${GREEN}* $peer${NC} (actual)"
        else
            echo "    $peer"
        fi
    done
}

# Manejo de argumentos
case "${1:-rotate}" in
    "rotate")
        rotate_ip
        ;;
    "status")
        show_status
        ;;
    "list")
        list_peers_cmd
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "Comando desconocido: $1"
        show_help
        exit 1
        ;;
esac 