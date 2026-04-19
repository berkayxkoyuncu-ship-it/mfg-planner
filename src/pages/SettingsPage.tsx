import { useLines } from '../hooks/useLines'
import { LineManager } from '../components/Lines/LineManager'
import { HolidayManager } from '../components/Holidays/HolidayManager'
import { BrandManager } from '../components/Brands/BrandManager'

export function SettingsPage() {
  const { lines, addLine, updateLine, deleteLine } = useLines()

  return (
    <div className="flex-1 overflow-auto" style={{ background: '#f7f8fa' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
        <BrandManager />
        <LineManager
          lines={lines}
          onAdd={addLine}
          onUpdate={updateLine}
          onDelete={deleteLine}
        />
        <HolidayManager />
      </div>
    </div>
  )
}
