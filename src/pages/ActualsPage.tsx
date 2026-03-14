import { useLines } from '../hooks/useLines'
import { useOrders } from '../hooks/useOrders'
import { useActuals } from '../hooks/useActuals'
import { ActualsPanel } from '../components/Actuals/ActualsPanel'

export function ActualsPage() {
  const { lines } = useLines()
  const { orders } = useOrders()
  const { actuals, upsertActual } = useActuals()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ActualsPanel lines={lines} orders={orders} actuals={actuals} onUpsert={upsertActual} />
    </div>
  )
}
