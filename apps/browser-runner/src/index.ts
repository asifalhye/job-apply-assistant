/**
 * Standalone browser runner CLI.
 * Usage: npx tsx src/index.ts <job-url>
 *
 * The main runner is integrated into the API (/runner/* routes).
 * This CLI is provided for headless/scripted usage.
 */
import 'dotenv/config';

const url = process.argv[2];
if (!url) {
  console.error('Usage: npx tsx src/index.ts <job-url>');
  process.exit(1);
}

const API = process.env.API_URL ?? 'http://localhost:3001';

async function main() {
  console.log(`Starting application run for: ${url}`);

  const startRes = await fetch(`${API}/runner/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobUrl: url }),
  });

  if (!startRes.ok) {
    console.error('Failed to start runner:', await startRes.text());
    process.exit(1);
  }

  const session = await startRes.json() as {
    applicationId: number;
    atsType: string;
    fields: { label: string; type: string; proposedValue?: string; id: string; selector?: string }[];
  };

  console.log(`Detected ATS: ${session.atsType}`);
  console.log(`Fields: ${session.fields.length}`);

  const fillable = session.fields.filter((f) => f.proposedValue);
  console.log(`Fillable: ${fillable.length}`);

  const fillRes = await fetch(`${API}/runner/fill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fillable }),
  });

  const result = await fillRes.json();
  console.log(JSON.stringify(result, null, 2));
  console.log('\nReview the browser before submitting. Auto-submit is disabled.');
}

main().catch(console.error);
