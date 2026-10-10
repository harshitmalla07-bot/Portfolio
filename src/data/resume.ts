// Single source of truth for the /resume page (and, later, the generated PDF).
// Sources: Harshit Malla Resume.docx and LinkedIn profile export (October 2026).

export interface Job {
	role: string;
	org: string;
	where: string;
	dates: string;
	bullets: string[];
}

export interface School {
	degree: string;
	school: string;
	where: string;
	dates: string;
	details: string[];
}

export interface Resume {
	updated: string;
	summary: string;
	experience: Job[];
	education: School[];
	awards: string[];
	skills: Record<string, string[]>;
}

export const resume: Resume = {
	updated: 'October 2026',
	summary:
		'Second-year computer engineering student at McMaster, focused on digital design and chip design. I want to work on the silicon behind computing and robotics. Growing up on Transformers movies probably had something to do with it.',
	experience: [
		{
			role: 'Team lead, mechatronic design and systems integration',
			org: 'VEX Robotics',
			where: 'Fort McMurray, AB',
			dates: 'Sep 2019 – Jun 2025',
			bullets: [
				'Led design, CAD modeling and fabrication of competition robots across 6 seasons, ranking 165th of 20,000+ teams worldwide in the 2024–25 VEX World Championship season.',
				'Won the VEX Robotics Alberta Provincial Championship and the Excellence Award (March 2025), the program’s highest combined award for performance, design documentation and interviews.',
				'Ran full design cycles in Autodesk Inventor, simulating drivetrain and lift mechanisms before fabrication to cut rebuild iterations and keep robots competition-ready across 10+ tournaments per season.',
				'Resolved internal and cross-team conflicts during alliance play, coordinating strategy with partner teams under match-time pressure.',
			],
		},
		{
			role: 'Creative director',
			org: 'STEM Fellowship',
			where: 'Fort McMurray, AB',
			dates: 'Feb 2024 – Jun 2025',
			bullets: [
				'Helped lead HackFortMac, a community hackathon hosted at Westwood High School.',
				'Built and delivered a workshop on creating and pitching business models.',
				'Supported fundraising efforts that cut club costs by 59%.',
				'Designed brochures and managed the chapter’s social media accounts.',
			],
		},
		{
			role: 'Youth counsellor',
			org: 'BGC Fort McMurray',
			where: 'Fort McMurray, AB',
			dates: 'Sep 2023 – Feb 2024',
			bullets: [
				'Mentored youth through group and one-on-one guidance focused on leadership and communication.',
				'Created slideshows and workshops teaching students basic coding.',
				'Organized holiday events and led daily physical activities.',
			],
		},
	],
	education: [
		{
			degree: 'B.Eng., Computer Engineering and Management',
			school: 'McMaster University',
			where: 'Hamilton, ON',
			dates: 'Sep 2025 – Apr 2029 (expected)',
			details: ['Second year', 'GPA 3.86 / 4.0'],
		},
	],
	awards: [
		'McMaster Award of Excellence ($3,000)',
		'Alexander Rutherford Scholarship ($2,500)',
		'YMM Rising Stars Award',
		'CEMC Certificate of Distinction, University of Waterloo',
		'VEX Robotics Alberta Provincial Champion and Excellence Award, 2025',
		'ASAA Badminton Provincials, gold medal in doubles',
	],
	skills: {
		'RTL and verification': ['Verilog', 'Icarus Verilog', 'Verilator', 'cocotb', 'GTKWave', 'RISC-V toolchain'],
		'FPGA and embedded': ['Tang Nano 9K', 'ESP32-S3', 'C/C++ (PlatformIO)', 'Arduino', 'I2C', 'UART'],
		Hardware: ['Circuit prototyping', 'Soldering', 'Wiring', 'Mechanical testing'],
		Software: ['Python', 'MATLAB', 'Git and GitHub', 'REST APIs'],
		'CAD and fabrication': ['Autodesk Inventor', '3D printing'],
		Spoken: ['English', 'Telugu (native)'],
	},
};
