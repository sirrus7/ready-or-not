// src/core/content/InvestmentOptions.ts - Corrected to match PDFs exactly

import {InvestmentOption} from '@shared/types/game';

export const allInvestmentOptionsData: Record<string, InvestmentOption[]> = {
    'rd1-invest': [
        {
            id: 'A',
            name: "Business Growth Strategy",
            cost: 50000,
            description: "Invest in a business consultant to help create a long-term vision & strategy for ALU. You'll receive a strategy report that could help Alu grow by providing market research, data analysis, and improved leadership alignment.",
            is_immediate_purchase: true,
            immediate_purchase_type: 'business_growth_strategy',
            immediate_purchase_message: "You'll receive a Business Growth Strategy Report from your host with valuable insights about other investment options.",
            host_notification_message: "Team needs Business Growth Strategy Report delivered.",
            report_name: "Business Growth Strategy Report"
        },
        {
            id: 'B',
            name: "Production Efficiency",
            cost: 100000,
            description: "Transition Alu's manufacturing from chaos to stability by adopting a Lean Culture. Hire skilled coaches to integrate Lean philosophy and training across Alu. Focus on optimizing employees and equipment before capital-intensive projects."
        },
        {
            id: 'C',
            name: "Add 2nd Shift",
            cost: 50000,
            description: "Invest $50K for the recruiting costs and additional overhead of a 2nd Shift. Includes five new line techs, one new line lead and a new supervisor to allow your factory to make SUPs in the evening. Eliminates the 'waste' of your factory sitting idle 2/3rds of the day."
        },
        {
            id: 'D',
            name: "Supply Chain Optimization",
            cost: 75000,
            description: "Make your supply chain a competitive advantage by giving the Supply Chain Mgr. training, coaching and resources to build and run an Optimization Strategy. Evolve inventory cycle counting from annual to daily & weekly with real-time inventory data."
        },
        {
            id: 'E',
            name: "Employee Development",
            cost: 50000,
            description: "Invest in your most valuable asset – employees – by creating an employee training and development program. Task HR and managers to observe and document work processes, which naturally reduces quality problems and improves efficiency."
        },
        {
            id: 'F',
            name: "Maximize Sales",
            cost: 100000,
            description: "Expand Alu's sales and distribution channels by hiring experts to conduct consumer research and brand building projects. Help develop a brand, marketing and sales plan to expand Alu's footprint in online and brick & mortar specialty outdoor watersports stores."
        },
    ],
    'rd2-invest': [
        {
            id: 'A',
            name: "Business Growth Strategy",
            cost: 75000,
            description: "Decide quickly on this investment! Strategic planning provided insight into opportunities to improve day-to-day operations including rethinking the $1,000 price point assumption, allowing for increased margins and more cash for further expansion.",
            is_immediate_purchase: true,
            immediate_purchase_type: 'business_growth_strategy',
            immediate_purchase_message: "You'll receive a Strategic Planning Document from your host with detailed KPI analysis and recommendations.",
            host_notification_message: "Team needs Strategic Planning Document delivered.",
            report_name: "Strategic Planning Document"
        },
        {
            id: 'B',
            name: "Production Efficiency",
            cost: 200000,
            description: "RD1 gains were exciting, however, consistent improvement requires consistent investment and effort. Expand your focus to organizational leadership practices to sustain existing and future improvements, including problem-solving behaviors, total quality management and predictive maintenance systems."
        },
        {
            id: 'C',
            name: "Expanded 2nd Shift",
            cost: 75000,
            description: "The 2nd Shift delivered CAP, but depending on other investments, may also have exasperated inefficient processes. This investment pays to hire four additional line techs and three temps to expand into two 2nd shift production lines."
        },
        {
            id: 'D',
            name: "Supply Chain Optimization",
            cost: 150000,
            description: "Continue investing to optimize Alu's supply chain with a focus on material supplies and freight services. Hire a logistics specialist to establish better vendor relationships and improved payment and freight terms to improve supply chain reliability."
        },
        {
            id: 'E',
            name: "Employee Development",
            cost: 175000,
            description: "The employee development program paid off with both COST savings and CAP increases thanks to a significantly more flexible and motivated workforce. Continue to develop employees and hire an HR specialist to ease the increasingly challenging HR load."
        },
        {
            id: 'F',
            name: "Maximize Boutique Sales",
            cost: 225000,
            description: "Investing in sales and distribution resulted grew ORDERS and ASP delivering a positive ROI. Continue building and expanding ALU's brand by hiring a marketing agency to help attract potential customers, engage existing customers and drive Direct to Consumer and retail sales."
        },
        {
            id: 'G',
            name: "Expand Distribution Channels: Big Box",
            cost: 125000,
            description: "Web-based direct to consumer sales and brick and mortar boutique retailers have been the bread and butter of ALU's growth to date. However, if Alu were to break into big box retailers, it would provide access to a much larger customer base with vastly expanded national, and possibly even international, market penetration."
        },
        {
            id: 'H',
            name: "Enterprise Resource Planning",
            cost: 100000,
            description: "Alu's rapid growth has brought complexity. Managing data from different supply and distribution channels and your need to make better informed financial and operational decisions has your head spinning. Investing in an ERP program and software could be the solution."
        },
        {
            id: 'I',
            name: "IT & Cybersecurity",
            cost: 50000,
            description: "Invest in IT services, hardware and software upgrades plus more robust cyber security protection. A recent free consultation with a cybersecurity software company identified several network vulnerabilities, critical upgrades and the need for ongoing support services."
        },
        {
            id: 'J',
            name: "Product Line Expansion: Inflatables",
            cost: 150000,
            description: "AIRHEAD, a white-label manufacturer that specializes in making high-quality inflatable watersports products for outdoor industry brands, is offering to partner with Alu. A two-year partnership would allow ALU to market their high-quality inflatable SUPs to existing wholesale customers and direct to consumer."
        },
        {
            id: 'K',
            name: "Automation & Co-Bots",
            cost: 100000,
            description: "Build a new, semi-automated production line to maximize productivity in your existing factory space. This investment takes you into the future with the purchase of one CNC foam shaping machine and one automated wood laser cutter."
        }
    ],
    'rd3-invest': [
        // Note: Option A (Business Growth Strategy) is NOT available in RD-3 per PDF
        {
            id: 'B',
            name: "Production Efficiency",
            cost: 75000, // Only available if invested in RD-2
            description: "After years of dedicated continuous improvement to your production operations, Alu's shop floor is hardly recognizable from where it started. Production Efficiency requires continued investment to sustain these gains and drive deeper improvements that allow you to seamlessly integrate other investments such as automation and staffing changes faster and with greater impact."
        },
        {
            id: 'C',
            name: "Expanded 2nd Shift",
            cost: 100000,
            description: "Growth is often tricky and building the 2nd Shift gave you the CAP to quickly fill growing ORDERS. With two 2nd Shift production lines running, invest to keep them working and add additional temp and overtime workers to staff a third 2nd Shift production line."
        },
        {
            id: 'D',
            name: "Supply Chain Optimization",
            cost: 75000, // Only available if invested in RD-2
            description: "Your warehouse and logistics team investments improved internal efficiency and external relationships delivering increased capacity and lower costs. Continue investing in software and data analysis to deliver a more intelligent supplier replenishment program while building the capability to predict and respond quickly to potential supply chain disruptions."
        },
        {
            id: 'E',
            name: "Employee Development",
            cost: 300000,
            description: "Investing in Human Resources and Employee Development paid off with reduced COSTS and higher CAP thanks to a significantly more flexible and motivated workforce. Take the next step by hiring an HR firm to integrate a Human Resources Management System that rewards demonstrated skills and knowledge rather than tenure and relationships."
        },
        {
            id: 'F',
            name: "Maximize Boutique Sales",
            cost: 225000,
            description: "This investment increased both ORDERS and ASP, delivering a positive ROI. Continue building and expanding Alu's brand by partnering with a marketing agency to attract new boutique store customers, deepen relationships with existing retailers and drive premium Direct to Consumer ORDERS."
        },
        {
            id: 'G',
            name: "Expand Distribution Channels: Big Box",
            cost: 300000,
            description: "Your investment helped Alu break into Richards, a big-box retailer specializing in sporting goods. If you didn't have an optimized supply chain, you struggled to meet the challenging requirements. Conversely, companies with an optimized supply chain met the contract terms on time and earned a substantial ROI. Continue investing in the partnership with Richards, which is prepared to order even more boards this year."
        },
        {
            id: 'H',
            name: "Enterprise Resource Planning",
            cost: 125000,
            description: "The ERP investment allowed you to finally resolve several problem-causing inconsistencies between sales, finance and production and allowed Alu to overcome some growth hurdles that would have been nearly impossible using a combination of financial software and home-grown Excel spreadsheets. Continue investing to ensure to integrate other departments such as shipping, so that you can make even better data-driven business decisions."
        },
        {
            id: 'I',
            name: "IT & Cybersecurity",
            cost: 75000,
            description: "Investing in IT Services hasn't delivered a strong ROI, but it provides protection from potentially costly cyber attacks and accidental malware installations. Continue investing in hardware and software upgrades plus more robust cyber security protection, and ongoing support services."
        },
        {
            id: 'J',
            name: "Product Line Expansion: Inflatables",
            cost: 150000,
            description: "The contract with AIRHEAD succeeded in adding CAP & some ORDERS, but demand for inflatables was a bit underwhelming. The timing may have been off, and it is possible that changes in market trends could see greater demand if you invest in additional marketing and distribution for inflatables."
        },
        {
            id: 'K',
            name: "Automation & Co-Bots",
            cost: 300000,
            description: "Alu's use of automation in its fourth line made a huge improvement in both CAP and quality – especially if combined with an investment in Production Efficiency. Invest to modernize all Alu lines with automated shaping and cutting machines. Not only does it make those lines more efficient and improve quality, it frees workers for other value-added activities like customization, which can help raise ASP."
        }
    ]
};
