{/* Replace your current <section className="main-grid"> ... </section>
    down to just before <ScenarioSimulation ... /> with the block below. */}

<section className="main-grid">
  <div className="left-stack">
    <CaliforniaCapacityMap hospitals={filteredHospitals} selectedBedType={bedType} />

    <div className="panel">
      <div className="section-head">
        <div>
          <h3>
            <Building2 size={18} />
            Facility Operational View
          </h3>
          <p>
            Real-time staffed-bed availability, status, EMS pressure, and reporting health.
          </p>
        </div>
        <StatusPill tone="slate">{filteredHospitals.length} facilities in scope</StatusPill>
      </div>

      <div className="hospital-table-wrap">
        <table className="hospital-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Status</th>
              <th>Reporting</th>
              <th>Available / Staffed</th>
              <th>Boarding</th>
              <th>EMS</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredHospitals.map((hospital) => {
              const relevantBeds =
                bedType === 'All'
                  ? hospital.beds
                  : hospital.beds.filter((bed) => bed.type === bedType);

              const staffed = relevantBeds.reduce((sum, bed) => sum + bed.staffed, 0);
              const available = relevantBeds.reduce((sum, bed) => sum + bed.available, 0);

              return (
                <tr key={hospital.id}>
                  <td>
                    <div className="facility-title">{hospital.name}</div>
                    <div className="facility-sub">
                      {hospital.county} County · {hospital.region} · Trauma {hospital.traumaLevel}
                    </div>
                  </td>
                  <td>
                    <StatusPill tone={getStatusTone(hospital.status)}>{hospital.status}</StatusPill>
                  </td>
                  <td>
                    <div>{hospital.reportingMethod}</div>
                    <div className="muted">{hospital.ehr}</div>
                  </td>
                  <td>
                    <strong>
                      {available} / {staffed}
                    </strong>
                  </td>
                  <td>{hospital.boardingPatients}</td>
                  <td>
                    <div>{hospital.emsWallTimeMinutes} min</div>
                    <div className="muted">{hospital.ambulanceQueue} queued</div>
                  </td>
                  <td className="notes-cell">{hospital.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    <div className="chart-card">
      <div className="section-head">
        <div>
          <h3>
            <BedDouble size={18} />
            Capacity trend outlook
          </h3>
          <p>Illustrative availability trend across the current scenario.</p>
        </div>
        <div className="legend-group">
          <span>
            <i className="legend-dot blue" />
            Available capacity
          </span>
          <span>
            <i className="legend-dot amber" />
            Stress threshold
          </span>
        </div>
      </div>

      <svg
        className="chart-svg"
        viewBox="0 0 720 220"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Trend chart"
      >
        <line x1="40" y1="170" x2="680" y2="170" stroke="var(--line)" />
        <line x1="40" y1="40" x2="40" y2="170" stroke="var(--line)" />

        <line
          x1="40"
          y1="95"
          x2="680"
          y2="95"
          stroke="var(--amber)"
          strokeDasharray="6 6"
          opacity="0.7"
        />

        {chartPoints.map((point, index) => {
          const x = 40 + index * 106;
          const y = 170 - point;
          const next = chartPoints[index + 1];

          return (
            <g key={index}>
              {next !== undefined && (
                <line
                  x1={x}
                  y1={y}
                  x2={40 + (index + 1) * 106}
                  y2={170 - next}
                  stroke="var(--blue)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              )}
              <circle cx={x} cy={y} r="5" fill="var(--blue)" />
              <text x={x} y="192" textAnchor="middle" className="chart-label">
                H{index + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  </div>

  <div className="right-stack">
    <div className="panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Activity size={18} />
            Live alert stream
          </h3>
          <p>Critical, warning, and informational operational updates.</p>
        </div>
      </div>

      <div className="alert-list">
        {scenarioAlerts.map((alert) => (
          <div key={alert.id} className={`alert-item ${alert.level}`}>
            <div>
              <div className="alert-title">{alert.title}</div>
              <p>{alert.detail}</p>
            </div>
            <div className="right-align">
              <StatusPill tone={getAlertTone(alert.level)}>{alert.level}</StatusPill>
              <span className="alert-time">{alert.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Ambulance size={18} />
            EMS metrics
          </h3>
          <p>Operational indicators relevant to patient movement and offload pressure.</p>
        </div>
      </div>

      <div className="metric-list">
        {emsMetrics.map((item) => (
          <div className="metric-item" key={item.label}>
            <div>
              <div className="metric-label">{item.label}</div>
              <div className="metric-value">{item.value}</div>
              <span>{item.trend}</span>
            </div>

            <StatusPill
              tone={item.tone === 'good' ? 'green' : item.tone === 'warn' ? 'amber' : 'red'}
            >
              {item.tone}
            </StatusPill>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

<section className="ops-console-grid">
  <div className="ops-console-main">
    <div className="panel">
      <div className="section-head compact">
        <div>
          <h3>
            <ShieldCheck size={18} />
            Onboarding & validation
          </h3>
          <p>Facility activation and feed validation milestones.</p>
        </div>
      </div>

      <div className="onboarding-list">
        {onboardingSites.map((item) => (
          <div className="onboarding-item" key={item.hospital}>
            <div>
              <strong>{item.hospital}</strong>
              <span>{item.owner}</span>
            </div>
            <div className="right-align">
              <StatusPill
                tone={
                  item.phase === 'Live'
                    ? 'green'
                    : item.phase === 'Validation'
                      ? 'amber'
                      : 'slate'
                }
              >
                {item.phase}
              </StatusPill>
              <span className="muted">{item.eta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Workflow size={18} />
            RFP alignment
          </h3>
          <p>Illustrative feature-to-requirement alignment for the demo scope.</p>
        </div>
      </div>

      <div className="alignment-grid">
        {rfpAlignment.map((item) => (
          <div className="alignment-card" key={item.title}>
            <h4>{item.title}</h4>
            <p>{item.summary}</p>
          </div>
        ))}
      </div>
    </div>

    <section className="operational-intelligence">
      <div className="section-head">
        <div>
          <h3>
            <Workflow size={18} />
            Operational Intelligence
          </h3>
          <p>Decision support, interoperability confidence, and live command coordination.</p>
        </div>
      </div>

      <div className="intelligence-grid">
        <IncidentCoordination scenario={scenario} />
        <InteroperabilityFeedHealth scenario={scenario} />
      </div>
    </section>
  </div>

  <aside className="ops-console-side">
    <div className="panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Clock3 size={18} />
            Event feed
          </h3>
          <p>Recent operational activity entering the platform.</p>
        </div>
      </div>

      <div className="feed-list">
        {eventFeed.map((item) => (
          <div className="feed-item" key={item.id}>
            <div>
              <strong>{item.event}</strong>
              <p>{item.category}</p>
            </div>
            <span className="feed-time">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  </aside>
</section>

<ScenarioSimulation scenario={scenario} onChangeScenario={setScenario} />
