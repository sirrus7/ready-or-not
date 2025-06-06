
import React from 'react';
import { Download, FileText, Code } from 'lucide-react';
import { useTeamCardsPDF } from '@shared/hooks/pdf';
import type { TeamConfig } from '@shared/hooks/pdf';

const TeamCardsPDFDemo: React.FC = () => {
    const { generatePDF, isGenerating } = useTeamCardsPDF();

    const sampleTeams: TeamConfig[] = [
        {
            id: '1',
            name: 'Alpha Team',
            members: ['John Doe', 'Jane Smith', 'Bob Johnson'],
            category: 'Development'
        },
        {
            id: '2',
            name: 'Beta Squad',
            members: ['Alice Brown', 'Charlie Wilson', 'Diana Lee'],
            category: 'Design'
        },
        {
            id: '3',
            name: 'Gamma Force',
            members: ['Eve Davis', 'Frank Miller'],
            category: 'Marketing'
        }
    ];

    const handleGenerate = async () => {
        try {
            await generatePDF(sampleTeams, {
                logoUrl: '/images/ready-or-not-logo.png',
                generateQRCode: (team) => `https://company.com/teams/${team.id || team.name}`
            });
        } catch (error) {
            alert('Error generating PDF: ' + (error as Error).message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Modular Team Cards PDF Generator</h1>
                <p className="text-gray-600">Clean, composable functions organized in separate files</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <FileText className="mr-2" />
                        Generate PDF Demo
                    </h3>

                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-3">
                            This will generate a PDF with {sampleTeams.length} team cards:
                        </p>
                        <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
                            {sampleTeams.map((team, i) => (
                                <div key={i}>
                                    <strong>{team.name}</strong> - {team.category} ({team.members?.length} members)
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
                    >
                        {isGenerating ? (
                            <>Generating PDF...</>
                        ) : (
                            <>
                                <Download className="mr-2" size={16} />
                                Generate & Download PDF
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <Code className="mr-2" />
                        Usage Examples
                    </h3>

                    <div className="text-sm space-y-3">
                        <div>
                            <p className="font-medium mb-2">Direct import:</p>
                            <code className="block bg-gray-100 p-2 rounded text-xs">
                                import {`{generateTeamCardsPDF}`} from './pdf';<br/>
                                await generateTeamCardsPDF(teams, assets);
                            </code>
                        </div>

                        <div>
                            <p className="font-medium mb-2">With React hook:</p>
                            <code className="block bg-gray-100 p-2 rounded text-xs">
                                const {`{generatePDF}`} = useTeamCardsPDF();<br/>
                                await generatePDF(teams, assets);
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">File Organization</h3>
                <div className="text-xs font-mono bg-white p-4 rounded">
                    <div>src/</div>
                    <div>├── pdf/</div>
                    <div>│   ├── types.ts</div>
                    <div>│   ├── config.ts</div>
                    <div>│   ├── utils/ (dom.ts, assets.ts, validation.ts)</div>
                    <div>│   ├── templates/ (team-card.ts, sections.ts)</div>
                    <div>│   ├── core/ (pdf-operations.ts, capture.ts)</div>
                    <div>│   ├── generator.ts</div>
                    <div>│   └── index.ts</div>
                    <div>├── hooks/useTeamCardsPDF.ts</div>
                    <div>└── components/TeamCardsPDFDemo.tsx</div>
                </div>
            </div>
        </div>
    );
};

export default TeamCardsPDFDemo;