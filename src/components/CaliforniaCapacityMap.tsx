import { useMemo, useState } from 'react';
import { MapPinned, Ambulance, Activity, Building2, X } from 'lucide-react';
import { StatusPill } from './StatusPill';
import type { BedType, HospitalRecord } from '../lib/data';

type Props = {
  hospitals: HospitalRecord[];
  selectedBedType: BedType | 'All';
};

function getAvailability(hospital: HospitalRecord, selectedBedType: BedType | 'All') {
  if (selectedBedType === 'All') {
    const staffed = hospital.beds.reduce((sum, bed) => sum + bed.staffed, 0);
    const available = hospital.beds.reduce((sum, bed) => sum + bed.available, 0);
    return { staffed, available };
  }

  const match = hospital.beds.find((bed) => bed.type === selectedBedType);
  return {
    staffed: match?.staffed ?? 0,
    available: match?.available ?? 0,
  };
}

function getPercent(hospital: HospitalRecord, selectedBedType: BedType | 'All') {
  const { staffed, available } = getAvailability(hospital, selectedBedType);
  if (!staffed) return 0;
  return Math.round((available / staffed) * 100);
}

function getTone(percent: number) {
  if (percent >= 25) return 'green';
  if (percent >= 10) return 'amber';
  return 'red';
}

function getCircleRadius(percent: number) {
  if (percent >= 25) return 14;
  if (percent >= 15) return 12;
  if (percent >= 8) return 11;
  return 10;
}

export function CaliforniaCapacityMap({ hospitals, selectedBedType }: Props) {
  const [activeHospitalId, setActiveHospitalId] = useState<string | null>(
    hospitals[0]?.id ?? null
  );

  const activeHospital = useMemo(() => {
    if (!activeHospitalId) return null;
    return hospitals.find((h) => h.id === activeHospitalId) ?? null;
  }, [activeHospitalId, hospitals]);

  return (
    <div className="panel map-panel">
      <div className="section-head">
        <div>
          <h3>
            <MapPinned size={18} />
            California Capacity Map
          </h3>
          <p>
            Click a facility marker to inspect available capacity, EMS pressure, and reporting
            status.
          </p>
        </div>

        <div className="legend-group">
          <StatusPill tone="green">Healthy capacity</StatusPill>
          <StatusPill tone="amber">Watch closely</StatusPill>
          <StatusPill tone="red">Critical capacity</StatusPill>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-canvas">
          <svg
            viewBox="0 0 360 520"
            className="california-svg"
            role="img"
            aria-label="California hospital capacity map"
            preserveAspectRatio="xMidYMid meet"
            >
            <defs>
              <filter id="map-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
                className="ca-outline"
                d="M78 34
                    L165 42
                    L195 58
                    L223 62
                    L250 99
                    L266 128
                    L289 161
                    L281 191
                    L293 220
                    L287 259
                    L304 286
                    L292 323
                    L304 356
                    L289 398
                    L260 469
                    L233 480
                    L205 452
                    L183 435
                    L161 424
                    L145 399
                    L116 372
                    L104 351
                    L88 311
                    L74 266
                    L57 208
                    L42 163
                    L50 113
                    L64 76
                    Z"
                />

            {hospitals.map((hospital) => {
              const percent = getPercent(hospital, selectedBedType);
              const tone = getTone(percent);
              const radius = getCircleRadius(percent);
              const isActive = activeHospital?.id === hospital.id;

              return (
                <g
                  key={hospital.id}
                  className="facility-marker-group"
                  onClick={() => setActiveHospitalId(hospital.id)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${hospital.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveHospitalId(hospital.id);
                    }
                  }}
                >
                  <circle
                    cx={hospital.map.x}
                    cy={hospital.map.y}
                    r={radius + 5}
                    className={`marker-halo halo-${tone} ${isActive ? 'is-active' : ''}`}
                    filter="url(#map-glow)"
                  />
                  <circle
                    cx={hospital.map.x}
                    cy={hospital.map.y}
                    r={radius}
                    className={`marker-core marker-${tone} ${isActive ? 'is-active' : ''}`}
                  />
                  <text
                    x={hospital.map.x}
                    y={hospital.map.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="marker-label"
                  >
                    {percent}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside className="map-detail-card">
          {activeHospital ? (
            <>
              <div className="map-detail-head">
                <div>
                  <div className="facility-title">{activeHospital.name}</div>
                  <div className="facility-sub">
                    {activeHospital.county} County · {activeHospital.region} · Trauma{' '}
                    {activeHospital.traumaLevel}
                  </div>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => setActiveHospitalId(null)}
                  aria-label="Clear selection"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="map-detail-status">
                <StatusPill
                  tone={
                    activeHospital.status === 'Normal'
                      ? 'green'
                      : activeHospital.status === 'Surge'
                        ? 'amber'
                        : 'red'
                  }
                >
                  {activeHospital.status}
                </StatusPill>
                <StatusPill tone="slate">{activeHospital.reportingMethod}</StatusPill>
                <StatusPill tone="slate">{activeHospital.ehr}</StatusPill>
              </div>

              <div className="map-metric-grid">
                <div className="map-metric">
                  <Building2 size={16} />
                  <div>
                    <span>Available Capacity</span>
                    <strong>{getPercent(activeHospital, selectedBedType)}%</strong>
                  </div>
                </div>

                <div className="map-metric">
                  <Ambulance size={16} />
                  <div>
                    <span>Ambulances Queued</span>
                    <strong>{activeHospital.ambulanceQueue}</strong>
                  </div>
                </div>

                <div className="map-metric">
                  <Activity size={16} />
                  <div>
                    <span>EMS Wall Time</span>
                    <strong>{activeHospital.emsWallTimeMinutes} min</strong>
                  </div>
                </div>
              </div>

              <div className="bed-breakdown">
                <h4>Bed Availability</h4>
                {activeHospital.beds.map((bed) => {
                  const pct = bed.staffed ? Math.round((bed.available / bed.staffed) * 100) : 0;
                  return (
                    <div key={bed.type} className="bed-breakdown-row">
                      <div>
                        <strong>{bed.type}</strong>
                        <span>
                          {bed.available} available / {bed.staffed} staffed
                        </span>
                      </div>
                      <div className={`bed-breakdown-value tone-${getTone(pct)}`}>{pct}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="map-notes">
                <h4>Operational Notes</h4>
                <p>{activeHospital.notes}</p>
              </div>
            </>
          ) : (
            <div className="map-empty-state">
              <h4>Select a facility</h4>
              <p>
                Click a marker on the map to inspect center-level capacity, queue pressure, and
                operational notes.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
