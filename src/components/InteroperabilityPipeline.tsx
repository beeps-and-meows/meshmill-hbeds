import { ArrowRight, FileCheck2, FileJson, HeartPulse, Lock, Send, ServerCog } from 'lucide-react';

export function InteroperabilityPipeline() {
  return (
    <section className="panel pipeline-panel">
      <div className="section-head">
        <div>
          <h3>
            <ServerCog size={18} />
            Interoperability Pipeline
          </h3>
          <p>
            A vertical slice of how hospital systems send data, how M.A.R.I.O. normalizes and
            validates it, and how the platform turns it into statewide operations and reporting.
          </p>
        </div>
      </div>

      <div className="pipeline-grid">
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <HeartPulse size={18} />
          </div>
          <strong>Hospital Source Systems</strong>
          <p>Epic, Oracle Cerner, MEDITECH, HL7 v2 feeds, FHIR APIs, REST, and SFTP.</p>
          <div className="pipeline-tags">
            <span>Outbound only</span>
            <span>No PHI</span>
          </div>
        </div>

        <div className="pipeline-arrow">
          <ArrowRight size={18} />
        </div>

        <div className="pipeline-card">
          <div className="pipeline-icon">
            <FileJson size={18} />
          </div>
          <strong>M.A.R.I.O. Canonical Mapping</strong>
          <p>
            Local field names, bed definitions, and formats are translated into the CDPH canonical
            schema through configuration-driven mapping.
          </p>
          <div className="pipeline-tags">
            <span>FHIR R4</span>
            <span>HL7 v2</span>
            <span>SFTP</span>
          </div>
        </div>

        <div className="pipeline-arrow">
          <ArrowRight size={18} />
        </div>

        <div className="pipeline-card">
          <div className="pipeline-icon">
            <FileCheck2 size={18} />
          </div>
          <strong>Validation &amp; Quality Assurance</strong>
          <p>
            Required fields, logical checks, anomaly detection, feed monitoring, and auditable
            submission traceability.
          </p>
          <div className="pipeline-tags">
            <span>Range checks</span>
            <span>Anomaly flags</span>
          </div>
        </div>

        <div className="pipeline-arrow">
          <ArrowRight size={18} />
        </div>

        <div className="pipeline-card">
          <div className="pipeline-icon">
            <Send size={18} />
          </div>
          <strong>Operational &amp; Reporting Outputs</strong>
          <p>
            Statewide dashboard visibility, CDPH 15-minute reporting cadence, and automated NHSN
            submission workflows.
          </p>
          <div className="pipeline-tags">
            <span>Dashboard</span>
            <span>CDPH API</span>
            <span>NHSN</span>
          </div>
        </div>
      </div>

      <div className="pipeline-footer">
        <div className="pipeline-assurance">
          <Lock size={16} />
          <span>Hospitals control transmission. The platform receives limited, operational data only.</span>
        </div>
      </div>
    </section>
  );
}
