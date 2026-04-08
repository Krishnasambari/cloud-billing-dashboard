import type { CloudAccount } from '../../types/billing'

interface Props {
  accounts: CloudAccount[]
  cloud: string
  cloudAccount: string
  onChange: (cloud: string, cloudAccount: string) => void
}

function cloudIcon(cloud: string) {
  if (cloud === 'azure') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.05 4.24L6.56 18.05l-1.32.01L8.67 12 5.24 8.24 13.05 4.24zM13.78 5.82L22 18.97H9.01l4.77-8.15z" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576a.347.347 0 01.056.184c0 .08-.048.16-.152.24l-.503.335a.383.383 0 01-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 01-.287-.375 6.18 6.18 0 01-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.030-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 01-.28.104.488.488 0 01-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 01.224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 011.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586z" />
    </svg>
  )
}

export default function CloudAccountSelector({ accounts, cloud, cloudAccount, onChange }: Props) {
  if (accounts.length === 0) return null

  const value = `${cloud}::${cloudAccount}`

  return (
    <div className="profile-selector">
      <span className={cloud === 'azure' ? 'text-blue-400' : 'text-orange-400'}>
        {cloudIcon(cloud)}
      </span>
      <select
        value={value}
        onChange={(e) => {
          const [c, ...rest] = e.target.value.split('::')
          onChange(c, rest.join('::'))
        }}
        className="profile-select"
      >
        {/* Group by cloud */}
        {['aws', 'azure'].map((c) => {
          const group = accounts.filter((a) => a.cloud === c)
          if (group.length === 0) return null
          return (
            <optgroup key={c} label={c === 'azure' ? 'Azure' : 'AWS'}>
              {group.map((a) => (
                <option key={`${a.cloud}::${a.cloud_account}`} value={`${a.cloud}::${a.cloud_account}`}>
                  {a.cloud_account}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
    </div>
  )
}
