export const OFFLINE_NOTICE_EVENT = 'offline-notice'

export function showOfflineSavedNotice() {
  window.dispatchEvent(
    new CustomEvent<string>(OFFLINE_NOTICE_EVENT, {
      detail: 'Zapisano lokalnie - zsynchronizuje sie automatycznie',
    }),
  )
}
