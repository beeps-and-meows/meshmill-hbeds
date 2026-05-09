import { Wind } from 'lucide-react';
import type { HospitalRecord, RespiratoryAgeGroup, RespiratoryDiseaseData } from '../lib/data';

interface SingleProps {
  facility: HospitalRecord;
  facilities?: never;
  scenario?: string;
}
interface AggregateProps {
  facilities: HospitalRecord[];
  facility?: never;
  scenario?: string;
}
type Props = SingleProps | AggregateProps;

function sumAgeGroup(groups: RespiratoryAgeGroup[]): RespiratoryAgeGroup {
  return groups.reduce(
    (acc, g) => ({ pediatric: acc.pediatric + g.pediatric, adult: acc.adult + g.adult, senior: acc.senior + g.senior }),
    { pediatric: 0, adult: 0, senior: 0 },
  );
}

function sumDisease(datasets: RespiratoryDiseaseData[]): RespiratoryDiseaseData {
  return {
    currentPatients: sumAgeGroup(datasets.map((d) => d.currentPatients)),
    newAdmissions: sumAgeGroup(datasets.map((d) => d.newAdmissions)),
  };
}

function rowTotal(g: RespiratoryAgeGroup) {
  return g.pediatric + g.adult + g.senior;
}

interface DiseaseRowProps {
  label: string;
  color: string;
  data: RespiratoryDiseaseData;
}

function DiseaseBlock({ label, color, data }: DiseaseRowProps) {
  const hospTotal = rowTotal(data.currentPatients);
  const admTotal = rowTotal(data.newAdmissions);
  return (
    <div className="resp-disease-block">
      <div className="resp-disease-label" style={{ borderLeftColor: color }}>
        {label}
      </div>
      <table className="resp-table">
        <tbody>
          <tr>
            <td className="resp-row-label">Currently hospitalized</td>
            <td>{data.currentPatients.pediatric}</td>
            <td>{data.currentPatients.adult}</td>
            <td>{data.currentPatients.senior}</td>
            <td className="resp-total">{hospTotal}</td>
          </tr>
          <tr>
            <td className="resp-row-label">New admissions (24 h)</td>
            <td>{data.newAdmissions.pediatric}</td>
            <td>{data.newAdmissions.adult}</td>
            <td>{data.newAdmissions.senior}</td>
            <td className="resp-total">{admTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function RespiratoryReporting({ facility, facilities, scenario }: Props) {
  const records = facility ? [facility] : (facilities ?? []);

  const covid19 = sumDisease(records.map((r) => r.respiratory.covid19));
  const influenza = sumDisease(records.map((r) => r.respiratory.influenza));
  const rsv = sumDisease(records.map((r) => r.respiratory.rsv));

  const statuses = records.map((r) => r.respiratory.nhsnStatus);
  const nhsnStatus =
    scenario === 'degraded'
      ? 'pending'
      : statuses.includes('failed')
      ? 'failed'
      : statuses.includes('pending')
      ? 'pending'
      : 'submitted';

  const statusLabel = nhsnStatus === 'submitted' ? 'Accepted by CDC' : nhsnStatus === 'pending' ? 'Pending ack' : 'Submission failed';
  const statusClass = nhsnStatus === 'submitted' ? 'tone-green' : nhsnStatus === 'pending' ? 'tone-amber' : 'tone-red';

  const facilityCount = records.length;
  const subtitle =
    facilityCount === 1
      ? `${records[0].name} — lab-confirmed inpatients and new admissions by age cohort`
      : `${facilityCount} facilities — statewide aggregate`;

  return (
    <section className="panel resp-panel">
      <div className="section-head compact">
        <div>
          <h3>
            <Wind size={18} />
            CDC/NHSN Respiratory Disease Surveillance
          </h3>
          <p>{subtitle} — SOW §11.A.2.ii–iii</p>
        </div>
        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="resp-col-headers">
        <span className="resp-row-label-spacer" />
        <span>0–17</span>
        <span>18–64</span>
        <span>65+</span>
        <span className="resp-total">Total</span>
      </div>

      <DiseaseBlock label="COVID-19" color="var(--amber)" data={covid19} />
      <DiseaseBlock label="Influenza" color="var(--blue, #60a5fa)" data={influenza} />
      <DiseaseBlock label="RSV" color="var(--green)" data={rsv} />

      <p className="resp-footnote">
        Reporting window: 2026-03-14 12:00 AM –{' '}
        {facilityCount === 1 ? records[0].nhsnLastSent.slice(11, 16) : '12:00 PM'} &nbsp;·&nbsp; Cadence: twice daily minimum &nbsp;·&nbsp; Transmission: automated
      </p>
    </section>
  );
}
