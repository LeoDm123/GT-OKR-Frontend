import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

/**
 * Formatea una fecha a formato relativo (today, X days ago, X weeks ago, etc.)
 */
export const formatRelativeTime = (date: string | Date | undefined): string => {
    if (!date) return ''

    const dateObj = dayjs(date)
    const now = dayjs()
    const diffInDays = now.diff(dateObj, 'day')

    if (diffInDays === 0) {
        return 'today'
    } else if (diffInDays === 1) {
        return 'yesterday'
    } else if (diffInDays < 7) {
        return `${diffInDays} days ago`
    } else if (diffInDays < 14) {
        return '1 week ago'
    } else if (diffInDays < 21) {
        return '2 weeks ago'
    } else if (diffInDays < 28) {
        return '3 weeks ago'
    } else {
        const diffInWeeks = Math.floor(diffInDays / 7)
        if (diffInWeeks === 1) {
            return '1 week ago'
        } else if (diffInWeeks < 4) {
            return `${diffInWeeks} weeks ago`
        } else {
            const diffInMonths = Math.floor(diffInDays / 30)
            if (diffInMonths === 1) {
                return '1 month ago'
            } else if (diffInMonths < 12) {
                return `${diffInMonths} months ago`
            } else {
                const diffInYears = Math.floor(diffInDays / 365)
                return diffInYears === 1
                    ? '1 year ago'
                    : `${diffInYears} years ago`
            }
        }
    }
}
