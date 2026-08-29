import path from 'node:path'
import { test, expect } from '@playwright/test'
import { endShift, loginAsTestDriver, startShiftWithVehicle, toggleCheckbox } from './support/actions'
import { getTestContext, type TestContext } from './support/testSupabaseClient'
import {
  deleteIncident,
  deleteRoute,
  deleteSession,
  deleteTask,
  findActiveSessionId,
  findAnyOtherDriverName,
  findFirstAvailableVehicle,
  findIncidentByDescription,
  findTaskByDescription,
  forceEndAnyActiveSession,
  seedRouteWithChecklistItem,
  setSessionRoute,
} from './support/testData'

const RUN_ID = Date.now()
const AD_HOC_TASK_DESCRIPTION = `E2E ad-hoc zadanie ${RUN_ID}`
const TASK_NOTE = `E2E notatka ${RUN_ID}`
const INCIDENT_DESCRIPTION = `E2E zgloszenie awarii ${RUN_ID}`
const TEST_PHOTO_PATH = path.resolve(import.meta.dirname, 'fixtures/test-photo.png')

let ctx: TestContext
const created: {
  routeId: string | null
  sessionId: string | null
  taskId: string | null
  incidentId: string | null
} = { routeId: null, sessionId: null, taskId: null, incidentId: null }

test.beforeAll(async () => {
  ctx = await getTestContext()
  await forceEndAnyActiveSession(ctx.db, ctx.driverId)
})

test.afterEach(async () => {
  // Best-effort, independent cleanups - one failing must not hide the others.
  if (created.incidentId) {
    const incident = await findIncidentByDescription(ctx.db, ctx.driverId, INCIDENT_DESCRIPTION)
    await deleteIncident(ctx.db, created.incidentId, incident?.photoUrl ?? null).catch((err) =>
      console.error('Sprzatanie: nie udalo sie usunac zgloszenia awarii', err),
    )
  }
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
  if (created.routeId) {
    await deleteRoute(ctx.db, created.routeId).catch((err) =>
      console.error('Sprzatanie: nie udalo sie usunac trasy testowej', err),
    )
  }
})

test('pelny cykl zmiany: logowanie -> zadania -> checklista -> awaria -> koniec zmiany', async ({
  page,
}) => {
  const vehicle = await findFirstAvailableVehicle(ctx.db)
  expect(vehicle, 'Brak dostepnego pojazdu (status=available) do przeprowadzenia testu').not.toBeNull()
  if (!vehicle) return

  const { routeId, itemName } = await seedRouteWithChecklistItem(ctx.db, vehicle.id)
  created.routeId = routeId
  const coDriverName = await findAnyOtherDriverName(ctx.db, ctx.driverId)

  await test.step('Logowanie', async () => {
    await loginAsTestDriver(page)
  })

  await test.step('Rozpoczecie zmiany przez wybor pojazdu z listy (z opcjonalnym wspolkierowca)', async () => {
    await startShiftWithVehicle(page, vehicle.plate, { coDriverName: coDriverName ?? undefined })
    await expect(page.getByRole('heading', { name: 'Zmiana w toku' })).toBeVisible()
  })

  const sessionId = await findActiveSessionId(ctx.db, ctx.driverId)
  expect(sessionId).not.toBeNull()
  created.sessionId = sessionId

  await test.step('Przypisanie trasy z checklista do sesji i przeladowanie', async () => {
    await setSessionRoute(ctx.db, sessionId!, routeId)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Zmiana w toku' })).toBeVisible()
  })

  await test.step('Lista zadan na dzis sie laduje', async () => {
    await expect(page.getByText('Ladowanie zmiany...')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Zadania na dzis' })).toBeVisible()
  })

  await test.step('Dodanie zadania ad-hoc', async () => {
    await page.getByRole('button', { name: '+ Dodaj zadanie' }).click()
    await page.locator('#new-task').fill(AD_HOC_TASK_DESCRIPTION)
    await page.getByRole('button', { name: 'Dodaj' }).click()
    await expect(page.getByText(AD_HOC_TASK_DESCRIPTION)).toBeVisible()
  })

  created.taskId = await findTaskByDescription(ctx.db, ctx.driverId, AD_HOC_TASK_DESCRIPTION)
  expect(created.taskId).not.toBeNull()

  await test.step('Odhaczenie zadania i dodanie notatki', async () => {
    const taskItem = page.locator('li', { hasText: AD_HOC_TASK_DESCRIPTION })
    await toggleCheckbox(taskItem.getByRole('checkbox', { name: 'Zakonczone' }), true)
    await expect(taskItem.getByText(AD_HOC_TASK_DESCRIPTION)).toHaveClass(/line-through/)

    await taskItem.getByText(AD_HOC_TASK_DESCRIPTION).click()
    await taskItem.locator('textarea').fill(TASK_NOTE)
    await taskItem.getByRole('button', { name: 'Zapisz notatke' }).click()
    await expect(taskItem.getByRole('button', { name: 'Zapisz notatke' })).toBeVisible()
  })

  await test.step('Checklista sprzetu - zaznaczenie jednej pozycji', async () => {
    await page.getByRole('button', { name: 'Sprzet na trase' }).click()
    await expect(page.getByText('0 / 1 zabranych')).toBeVisible()

    const checklistRow = page.locator('li', { hasText: itemName })
    await toggleCheckbox(checklistRow.getByRole('checkbox', { name: 'Zabrane' }), true)
    await expect(page.getByText('1 / 1 zabranych')).toBeVisible()

    await page.getByRole('button', { name: 'Zamknij' }).click()
  })

  await test.step('Zgloszenie awarii ze zdjeciem', async () => {
    await page.getByRole('button', { name: 'Zglos awarie' }).click()
    await page.locator('#incident-description').fill(INCIDENT_DESCRIPTION)

    const galleryFileInput = page.locator('input[type="file"]:not([capture])')
    await galleryFileInput.setInputFiles(TEST_PHOTO_PATH)
    await expect(page.getByAltText('Podglad wybranego zdjecia')).toBeVisible()

    await page.getByRole('button', { name: 'Zglos' }).click()
    await expect(page.getByRole('heading', { name: 'Zglos awarie' })).toHaveCount(0)
  })

  await expect
    .poll(() => findIncidentByDescription(ctx.db, ctx.driverId, INCIDENT_DESCRIPTION), {
      message: 'Zgloszenie awarii nie pojawilo sie w bazie',
    })
    .not.toBeNull()
  const incident = await findIncidentByDescription(ctx.db, ctx.driverId, INCIDENT_DESCRIPTION)
  created.incidentId = incident!.id
  expect(incident!.photoUrl, 'Zgloszenie powinno miec zapisany URL zdjecia').not.toBeNull()

  await test.step('Zakonczenie zmiany i powrot do ekranu startowego', async () => {
    await endShift(page)
    await expect(page.getByRole('button', { name: 'Rozpocznij zmiane' })).toBeVisible()
  })
})
