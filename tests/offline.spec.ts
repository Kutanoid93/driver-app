import { test, expect } from '@playwright/test'
import { endShift, loginAsTestDriver, startShiftWithVehicle, toggleCheckbox } from './support/actions'
import { getTestContext, type TestContext } from './support/testSupabaseClient'
import {
  deleteSession,
  deleteTask,
  findActiveSessionId,
  findFirstAvailableVehicle,
  findTaskByDescription,
  forceEndAnyActiveSession,
} from './support/testData'

const RUN_ID = Date.now()
const AD_HOC_TASK_DESCRIPTION = `E2E offline zadanie ${RUN_ID}`

const PENDING_QUEUE_BADGE = '[title="Operacje oczekuja na synchronizacje"]'

let ctx: TestContext
const created: { sessionId: string | null; taskId: string | null } = {
  sessionId: null,
  taskId: null,
}

test.beforeAll(async () => {
  ctx = await getTestContext()
  await forceEndAnyActiveSession(ctx.db, ctx.driverId)
})

test.afterEach(async ({ page }) => {
  // Delete via the Node-side client first, while the page may still be
  // offline. If we flipped the browser back online before this, the app's
  // own useOfflineSync would race to resync the still-queued task update
  // against the same row we're about to delete - harmless, but it logs a
  // confusing "0 rows" error that looks like a real bug.
  if (created.taskId) {
    await deleteTask(ctx.db, created.taskId).catch((err) =>
      console.error('Sprzatanie: nie udalo sie usunac zadania ad-hoc', err),
    )
  }
  if (created.sessionId) {
    await deleteSession(ctx.db, created.sessionId).catch((err) =>
      console.error('Sprzatanie: nie udalo sie usunac sesji', err),
    )
  }

  // Make sure we never leave the browser context stuck offline, even if an
  // earlier step in the test failed before it could flip this back.
  await page.context().setOffline(false).catch(() => {})
})

test('operacja offline trafia do kolejki lokalnej i synchronizuje sie po powrocie sieci', async ({
  page,
}) => {
  page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()))
  page.on('pageerror', (err) => console.log('[browser:pageerror]', err))

  const vehicle = await findFirstAvailableVehicle(ctx.db)
  expect(vehicle, 'Brak dostepnego pojazdu (status=available) do przeprowadzenia testu').not.toBeNull()
  if (!vehicle) return

  await loginAsTestDriver(page)
  await startShiftWithVehicle(page, vehicle.plate)
  await expect(page.getByRole('heading', { name: 'Zmiana w toku' })).toBeVisible()

  const sessionId = await findActiveSessionId(ctx.db, ctx.driverId)
  expect(sessionId).not.toBeNull()
  created.sessionId = sessionId

  await page.getByRole('button', { name: '+ Dodaj zadanie' }).click()
  await page.locator('#new-task').fill(AD_HOC_TASK_DESCRIPTION)
  await page.getByRole('button', { name: 'Dodaj' }).click()
  await expect(page.getByText(AD_HOC_TASK_DESCRIPTION)).toBeVisible()

  created.taskId = await findTaskByDescription(ctx.db, ctx.driverId, AD_HOC_TASK_DESCRIPTION)
  expect(created.taskId).not.toBeNull()

  await expect(page.locator(PENDING_QUEUE_BADGE)).toHaveCount(0)

  await test.step('Akcja wykonana offline trafia do lokalnej kolejki', async () => {
    await page.context().setOffline(true)

    const taskItem = page.locator('li', { hasText: AD_HOC_TASK_DESCRIPTION })
    await toggleCheckbox(taskItem.getByRole('checkbox', { name: 'Zakonczone' }), true)

    await expect(page.getByText(/Zapisano lokalnie/)).toBeVisible()
    await expect(page.locator(PENDING_QUEUE_BADGE)).toBeVisible()
    await expect(page.locator(PENDING_QUEUE_BADGE)).toHaveText('1')
  })

  await test.step('Powrot do sieci synchronizuje kolejke i chowa wskaznik', async () => {
    await page.context().setOffline(false)
    await expect(page.locator(PENDING_QUEUE_BADGE)).toHaveCount(0, { timeout: 15_000 })
  })

  await endShift(page)
  await expect(page.getByRole('button', { name: 'Rozpocznij zmiane' })).toBeVisible()
})
