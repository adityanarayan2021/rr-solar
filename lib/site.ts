export const site = {
  name: 'RR Solar Solutions',
  tagline: 'Complete Solar Energy Partner',
  url: 'https://www.rrsolarsolutions.in',
  email: 'rrsolarsolutions2@gmail.com',
  phones: ['9580446571', '6392585105'],
  whatsapp: '919580446571',
  address: {
    street: 'Mayapuri, Atrauli Kursi Road',
    city: 'Lucknow',
    postalCode: '226022',
    region: 'Uttar Pradesh',
    country: 'IN',
  },
} as const;

export const waLink = (msg = "Hi RR Solar Solutions, I'd like a free site survey and quotation.") =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;

export type Service = {
  slug: string;
  title: string;
  blurb: string;
  icon: 'panel' | 'home' | 'factory' | 'pump' | 'meter' | 'streetlight' | 'gear' | 'clipboard';
};

export const services: Service[] = [
  { slug: 'rooftop-solar-installation', title: 'Rooftop Solar Installation', blurb: 'End-to-end rooftop systems sized to your actual load, engineered for Lucknow rooftops and wind loads.', icon: 'panel' },
  { slug: 'residential-solar-systems', title: 'Residential Solar Systems', blurb: 'On-grid, off-grid and hybrid home systems from 1 kW to 10 kW, with PM Surya Ghar subsidy support.', icon: 'home' },
  { slug: 'commercial-industrial-solar', title: 'Commercial & Industrial Solar', blurb: 'High-capacity plants for factories, schools, hospitals and warehouses that cut peak tariff bills.', icon: 'factory' },
  { slug: 'solar-water-pump', title: 'Solar Water Pump', blurb: 'PM-KUSUM ready AC/DC pump sets for farms — irrigation without diesel or grid dependence.', icon: 'pump' },
  { slug: 'net-metering-assistance', title: 'Net Metering Assistance', blurb: 'We handle the discom paperwork, feasibility, inspection and meter installation on your behalf.', icon: 'meter' },
  { slug: 'solar-street-lights', title: 'Solar Street Lights', blurb: 'All-in-one and semi-integrated LED street lights for societies, panchayats and industrial campuses.', icon: 'streetlight' },
  { slug: 'operation-maintenance', title: 'Operation & Maintenance (AMC)', blurb: 'Scheduled cleaning, performance audits and breakdown response to protect your generation.', icon: 'gear' },
  { slug: 'epc-turnkey-projects', title: 'EPC Turnkey Projects', blurb: 'Design, procurement, civil, electrical and commissioning under one accountable contract.', icon: 'clipboard' },
];

export const whyUs = [
  { title: 'High Quality Products', body: 'Tier-1 modules, BIS-certified inverters and IS-standard cabling — no unbranded substitutions.' },
  { title: 'Expert Installation Team', body: 'In-house certified technicians, not subcontracted labour, on every site.' },
  { title: 'On-Time Project Delivery', body: 'Committed timelines written into the quotation and tracked to commissioning.' },
  { title: 'Competitive Pricing', body: 'Transparent per-kW pricing with the subsidy already worked into your numbers.' },
  { title: '24x7 Customer Support', body: 'Two direct lines and WhatsApp — you reach a person, not a ticket queue.' },
  { title: 'Warranty & After Sales', body: 'Module, inverter and workmanship warranties honoured with local service.' },
];

export const segments = [
  { title: 'Residential', body: 'Homes, villas and apartment societies across Lucknow and nearby districts.', icon: 'home' as const },
  { title: 'Commercial', body: 'Offices, showrooms, schools, hotels and hospitals on commercial tariffs.', icon: 'building' as const },
  { title: 'Industrial', body: 'Factories and warehouses with high daytime load and demand charges.', icon: 'factory' as const },
];

export const process = [
  { step: '01', title: 'Free Site Survey', body: 'We visit, measure usable shadow-free area and study your last 6 months of bills.' },
  { step: '02', title: 'Design & Quotation', body: 'System sizing, generation estimate, subsidy calculation and a fixed-price proposal.' },
  { step: '03', title: 'Installation', body: 'Structure, modules, inverter and safety gear installed by our own certified team.' },
  { step: '04', title: 'Net Metering & Handover', body: 'Discom liaison, meter commissioning, subsidy claim and O&M walkthrough.' },
];

/** Answers to what people actually search before buying solar in UP.
 *  Rendered on the page AND emitted as FAQPage schema for Google rich results. */
export const faqs = [
  {
    q: 'How much does a rooftop solar system cost in Lucknow?',
    a: 'Cost depends on system size and component quality. A typical 3 kW residential on-grid system covers most homes with a ₹3,000–4,000 monthly bill. Under the PM Surya Ghar scheme, central subsidy is available for residential systems up to 3 kW, with additional support in Uttar Pradesh. We give you a written, fixed-price quotation after a free site survey, with the subsidy already deducted so you see your real out-of-pocket cost.',
  },
  {
    q: 'How much roof area do I need?',
    a: 'As a rule of thumb, about 80–100 sq ft of shadow-free roof per kW. So a 3 kW system needs roughly 250–300 sq ft. Shading matters more than raw area — a shadow-free 250 sq ft beats a partly shaded 500 sq ft. We measure this during the free survey.',
  },
  {
    q: 'What is net metering and do you handle the paperwork?',
    a: 'Net metering lets you export surplus daytime generation to the grid and offset it against what you draw at night, so you are billed only on the net. We handle the entire discom process for you: feasibility application, technical approval, inspection coordination and bi-directional meter installation.',
  },
  {
    q: 'How long does installation take?',
    a: 'For a typical residential rooftop system, physical installation takes two to four days once material reaches site. The longer variable is discom approval and net-metering meter installation, which usually adds a few weeks. We give you a committed timeline in writing with the quotation.',
  },
  {
    q: 'What warranty do I get?',
    a: 'Solar modules typically carry a 25-year performance warranty and 10–12 year product warranty from the manufacturer. Inverters usually carry 5–10 years depending on brand. On top of that we provide our own workmanship warranty and local after-sales service, plus optional AMC covering scheduled cleaning and performance audits.',
  },
  {
    q: 'How much can I actually save on my electricity bill?',
    a: 'A correctly sized on-grid system commonly offsets the large majority of a daytime-heavy household bill, with payback frequently in the range of four to six years depending on tariff, consumption pattern and subsidy received. After payback, the generation is effectively free for the remaining system life. We calculate your specific numbers from your last six months of bills, rather than quoting a generic figure.',
  },
  {
    q: 'Do you work outside Lucknow?',
    a: 'Yes. We are based at Mayapuri, Atrauli Kursi Road in Lucknow and serve Lucknow and surrounding districts of Uttar Pradesh for residential, commercial and industrial projects, including solar water pumps for agricultural sites.',
  },
] as const;
