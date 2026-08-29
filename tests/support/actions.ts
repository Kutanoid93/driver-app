import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

// The task/checklist checkboxes are controlled inputs whose visual state
// only flips once React re-renders after an async chain resolves (a failed
// fetch -> isNetworkError check -> an IndexedDB write when offline, or a
// round trip to Supabase when online). `locator.check()` clicks once and
// verifies the state changed almost immediately, which is too tight for
// that gap and fails with "Clicking the checkbox did not change its state"
// even though the click is handled correctly. Clicking once and letting a
// normally-polling `expect(...).toBeChecked()` wait it out avoids that.
export async function toggleCheckbox(checkbox: Locator, checked: boolean): Promise<void> {
  if ((await checkbox.isChecked()) !== checked) {
    await checkbox.click()
  }
  await expect(checkbox).toBeChecked({ checked })
}

export async function loginAsTestDriver(page: Page): Promise<void> {
  const email = process.env.TEST_DRIVER_EMAIL
  const password = process.env.TEST_DRIVER_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Brak TEST_DRIVER_EMAIL / TEST_DRIVER_PASSWORD - uzupelnij dane testowego konta w pliku .env.test.',
    )
  }

  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Zaloguj sie' }).click()
  await page.waitForURL('/')
}

// Drives the "wybierz pojazd z listy" path (never the QR scanner) and picks
// the specific vehicle passed in - the caller already knows which vehicle
// this is (usually the same one it just seeded a route for), so we locate
// it by its unique plate rather than assuming list order.
export async function startShiftWithVehicle(
  page: Page,
  vehiclePlate: string,
  options: { coDriverName?: string } = {},
): Promise<void> {
  await page.goto('/start-shift')
  await page.getByRole('button', { name: 'Wybierz pojazd z listy' }).click()

  const vehicleButton = page.getByRole('button').filter({ hasText: vehiclePlate })
  await expect(vehicleButton).toBeVisible()
  await vehicleButton.click()

  await expect(page.getByRole('button', { name: 'Potwierdz i rozpocznij zmiane' })).toBeVisible()

  if (options.coDriverName) {
    await page.locator('#co-driver').selectOption({ label: options.coDriverName })
  }

  await page.getByRole('button', { name: 'Potwierdz i rozpocznij zmiane' }).click()
  await page.waitForURL('/shift')
}

export async function endShift(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Zakoncz zmiane' }).click()
  await page.getByRole('button', { name: 'Tak, zakoncz zmiane' }).click()
  await page.waitForURL('/')
}
