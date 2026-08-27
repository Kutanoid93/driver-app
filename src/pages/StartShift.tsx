import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrScanner } from '../components/QrScanner'
import { useAuth } from '../hooks/useAuth'
import {
  getAvailableVehicles,
  getDriverByEmail,
  getOtherDrivers,
  getTrailers,
  getVehicleByQrCode,
} from '../lib/api'
import { createSessionOffline } from '../lib/offlineActions'
import { showOfflineSavedNotice } from '../lib/offlineNotice'
import type { Driver, Trailer, Vehicle } from '../lib/database.types'

type Step = 'idle' | 'scan' | 'looking-up' | 'not-found' | 'pick-list' | 'confirm' | 'starting'

export function StartShift() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('idle')
  const [scanKey, setScanKey] = useState(0)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [hasTrailer, setHasTrailer] = useState(false)
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [trailersLoading, setTrailersLoading] = useState(false)
  const [selectedTrailerId, setSelectedTrailerId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [driverError, setDriverError] = useState<string | null>(null)
  const [coDrivers, setCoDrivers] = useState<Driver[]>([])
  const [selectedCoDriverId, setSelectedCoDriverId] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDriver() {
      if (!session?.user.email) return

      try {
        const found = await getDriverByEmail(session.user.email)
        if (cancelled) return

        if (!found) {
          setDriverError('Nie znaleziono profilu kierowcy dla tego konta.')
          return
        }

        setDriver(found)
      } catch (err) {
        console.error(err)
        if (!cancelled) setDriverError('Nie udalo sie zaladowac profilu kierowcy.')
      }
    }

    loadDriver()
    return () => {
      cancelled = true
    }
  }, [session])

  useEffect(() => {
    let cancelled = false

    async function loadCoDrivers() {
      if (!driver) return

      try {
        const others = await getOtherDrivers(driver.id)
        if (!cancelled) setCoDrivers(others)
      } catch (err) {
        console.error(err)
      }
    }

    loadCoDrivers()
    return () => {
      cancelled = true
    }
  }, [driver])

  async function handleScan(qrCode: string) {
    setStep('looking-up')

    try {
      const found = await getVehicleByQrCode(qrCode)

      if (!found) {
        setStep('not-found')
        return
      }

      setVehicle(found)
      setHasTrailer(false)
      setSelectedTrailerId('')
      setStep('confirm')
    } catch (err) {
      console.error(err)
      setStep('not-found')
    }
  }

  function handleStartScan() {
    setScanKey((key) => key + 1)
    setStep('scan')
  }

  async function handleShowVehicleList() {
    setStep('pick-list')

    if (availableVehicles.length === 0) {
      setVehiclesLoading(true)
      try {
        setAvailableVehicles(await getAvailableVehicles())
      } catch (err) {
        console.error(err)
      } finally {
        setVehiclesLoading(false)
      }
    }
  }

  function handleSelectVehicleFromList(selected: Vehicle) {
    setVehicle(selected)
    setHasTrailer(false)
    setSelectedTrailerId('')
    setStep('confirm')
  }

  function handleRescan() {
    setVehicle(null)
    setFormError(null)
    setSelectedCoDriverId('')
    setScanKey((key) => key + 1)
    setStep('scan')
  }

  async function handleTrailerToggle(withTrailer: boolean) {
    setHasTrailer(withTrailer)
    setSelectedTrailerId('')

    if (withTrailer && trailers.length === 0) {
      setTrailersLoading(true)
      try {
        setTrailers(await getTrailers())
      } catch (err) {
        console.error(err)
      } finally {
        setTrailersLoading(false)
      }
    }
  }

  async function handleConfirm() {
    if (!vehicle || !driver) return

    setStep('starting')
    setFormError(null)

    try {
      const result = await createSessionOffline({
        driverId: driver.id,
        vehicleId: vehicle.id,
        trailerId: hasTrailer && selectedTrailerId ? selectedTrailerId : undefined,
        coDriverId: selectedCoDriverId || undefined,
      })

      if (result.queued) {
        showOfflineSavedNotice()
        navigate('/', { replace: true })
        return
      }

      navigate('/shift', { replace: true })
    } catch (err) {
      console.error(err)
      setFormError('Nie udalo sie rozpoczac zmiany. Sprobuj ponownie.')
      setStep('confirm')
    }
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center gap-6 bg-white px-6 py-10 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="absolute left-4 top-4 text-sm text-slate-500 dark:text-slate-400"
      >
        Wroc
      </button>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Rozpocznij zmiane</h1>

      {step === 'idle' && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleStartScan}
            className="w-full rounded-lg bg-blue-700 px-8 py-4 text-lg font-medium text-white"
          >
            Skanuj pojazd
          </button>
          <p className="text-sm text-slate-400 dark:text-slate-500">lub</p>
          <button
            type="button"
            onClick={handleShowVehicleList}
            className="w-full rounded-lg border-2 border-blue-700 px-8 py-4 text-lg font-medium text-blue-700 dark:border-blue-400 dark:text-blue-400"
          >
            Wybierz pojazd z listy
          </button>
        </div>
      )}

      {step === 'pick-list' && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          {vehiclesLoading && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Ladowanie pojazdow...
            </p>
          )}

          {!vehiclesLoading && availableVehicles.length === 0 && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Brak dostepnych pojazdow.
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {availableVehicles.map((available) => (
              <li key={available.id}>
                <button
                  type="button"
                  onClick={() => handleSelectVehicleFromList(available)}
                  className="w-full rounded-xl border border-slate-200 p-4 text-left dark:border-slate-700"
                >
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {available.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {available.vehicle_type} - {available.plate}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setStep('idle')}
            className="text-sm text-slate-500 underline dark:text-slate-400"
          >
            Wroc do skanowania
          </button>
        </div>
      )}

      {step === 'scan' && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <QrScanner key={scanKey} onScan={handleScan} />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Skieruj kamere na kod QR na pojezdzie
          </p>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="text-sm text-slate-500 underline dark:text-slate-400"
          >
            Anuluj
          </button>
        </div>
      )}

      {step === 'looking-up' && (
        <p className="text-slate-500 dark:text-slate-400">Sprawdzanie pojazdu...</p>
      )}

      {step === 'not-found' && (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-red-600">Nie znaleziono pojazdu dla zeskanowanego kodu.</p>
          <button
            type="button"
            onClick={handleRescan}
            className="rounded-lg bg-blue-700 px-6 py-3 text-base font-medium text-white"
          >
            Skanuj ponownie
          </button>
        </div>
      )}

      {(step === 'confirm' || step === 'starting') && vehicle && (
        <div className="flex w-full max-w-sm flex-col gap-5">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <p className="text-sm text-slate-500 dark:text-slate-400">Wybrany pojazd</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{vehicle.name}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {vehicle.vehicle_type} - {vehicle.plate}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Przyczepa</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTrailerToggle(false)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
                  !hasTrailer
                    ? 'border-blue-700 bg-blue-50 text-blue-700 dark:bg-blue-950'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                Bez przyczepy
              </button>
              <button
                type="button"
                onClick={() => handleTrailerToggle(true)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
                  hasTrailer
                    ? 'border-blue-700 bg-blue-50 text-blue-700 dark:bg-blue-950'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                Z przyczepa
              </button>
            </div>
          </div>

          {hasTrailer && (
            <div className="flex flex-col gap-1">
              <label htmlFor="trailer" className="text-sm text-slate-600 dark:text-slate-300">
                Wybierz przyczepe
              </label>
              <select
                id="trailer"
                value={selectedTrailerId}
                onChange={(event) => setSelectedTrailerId(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{trailersLoading ? 'Ladowanie...' : 'Wybierz...'}</option>
                {trailers.map((trailer) => (
                  <option key={trailer.id} value={trailer.id}>
                    {trailer.name}
                    {trailer.plate ? ` (${trailer.plate})` : ''}
                  </option>
                ))}
              </select>
              {!trailersLoading && trailers.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Brak dostepnych przyczep.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="co-driver" className="text-sm text-slate-600 dark:text-slate-300">
              Wspolkierowca
            </label>
            <select
              id="co-driver"
              value={selectedCoDriverId}
              onChange={(event) => setSelectedCoDriverId(event.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">Brak wspolkierowcy</option>
              {coDrivers.map((coDriver) => (
                <option key={coDriver.id} value={coDriver.id}>
                  {coDriver.full_name}
                </option>
              ))}
            </select>
          </div>

          {driverError && <p className="text-sm text-red-600">{driverError}</p>}
          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={step === 'starting' || !driver || (hasTrailer && !selectedTrailerId)}
            className="rounded-lg bg-blue-700 px-4 py-3 text-base font-medium text-white disabled:opacity-60"
          >
            {step === 'starting' ? 'Rozpoczynanie...' : 'Potwierdz i rozpocznij zmiane'}
          </button>

          <button
            type="button"
            onClick={handleRescan}
            disabled={step === 'starting'}
            className="text-sm text-slate-500 underline disabled:opacity-60 dark:text-slate-400"
          >
            Skanuj inny pojazd
          </button>
        </div>
      )}
    </main>
  )
}
