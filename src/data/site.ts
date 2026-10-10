// Site-wide identity and contact details. Used by the nav, footer, hero, resume
// Credits section and page metadata.
export const site = {
	name: 'Harshit Malla',
	role: 'Computer engineering @ McMaster',
	description:
		'Harshit Malla, computer engineering student at McMaster. Digital design, RTL, FPGA and embedded projects, plus resume.',
	intro:
		'I build hardware end to end: CPUs in Verilog, firmware on ESP32, and the robots and tools in between. Every project here is a release. Take a record off to see what’s underneath.',
	availability: 'Open to Summer 2027 internships in RTL design, verification, FPGA or hardware engineering.',
	catalogYears: '2026',
	email: 'harshitmalla07@gmail.com',
	location: 'Hamilton, Ontario',
	// Served from public/. Regenerate from the Word file when the resume changes.
	resumePdf: '/Harshit-Malla-Resume.pdf',
	links: {
		github: 'https://github.com/harshitmalla07-bot',
		linkedin: 'https://www.linkedin.com/in/harshit-malla-782251281',
	},
} as const;
