/**
 * Utilitário para formatação segura de datas
 * Evita "Invalid Date" ao lidar com dados do backend
 */

/**
 * Valida se uma data é válida
 */
export function isValidDate(date: any): boolean {
    if (!date) return false
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime())
}

/**
 * Formata uma data no formato DD/MM/YYYY
 * @param date - String ISO, objeto Date ou null
 * @returns Data formatada ou "-" se inválida
 */
export function formatDate(date: string | Date | null | undefined): string {
    if (!isValidDate(date)) return '-'

    const d = new Date(date!)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()

    return `${day}/${month}/${year}`
}

/**
 * Formata uma data e hora no formato DD/MM/YYYY HH:mm
 * @param date - String ISO, objeto Date ou null
 * @returns Data e hora formatadas ou "-" se inválida
 */
export function formatDateTime(date: string | Date | null | undefined): string {
    if (!isValidDate(date)) return '-'

    const d = new Date(date!)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Formata apenas a hora no formato HH:mm
 * @param date - String ISO, objeto Date ou null
 * @returns Hora formatada ou "-" se inválida
 */
export function formatTime(date: string | Date | null | undefined): string {
    if (!isValidDate(date)) return '-'

    const d = new Date(date!)
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')

    return `${hours}:${minutes}`
}

/**
 * Formata data relativa (ex: "Hoje", "Ontem", "DD/MM/YYYY")
 * @param date - String ISO, objeto Date ou null
 * @returns Data formatada de forma relativa ou "-" se inválida
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
    if (!isValidDate(date)) return '-'

    const d = new Date(date!)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0)
    yesterday.setHours(0, 0, 0, 0)
    const compareDate = new Date(d)
    compareDate.setHours(0, 0, 0, 0)

    if (compareDate.getTime() === today.getTime()) {
        return 'Hoje'
    } else if (compareDate.getTime() === yesterday.getTime()) {
        return 'Ontem'
    }

    return formatDate(date)
}

/**
 * Formata nome do dia da semana
 * @param date - String ISO, objeto Date ou null
 * @returns Nome do dia da semana ou "-" se inválida
 */
export function formatWeekday(date: string | Date | null | undefined): string {
    if (!isValidDate(date)) return '-'

    const d = new Date(date as string | Date)
    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

    return weekdays[d.getDay()] || '-'
}
