import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedIssue } from './dto/issue.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async extractIssues(transcript: string): Promise<ExtractedIssue[]> {
    const prompt = `
You are an expert project manager. Analyze the following meeting transcript and extract all actionable tasks, bugs, and features discussed.

Return ONLY a valid JSON array with no extra text, no markdown, no code blocks.

Format:
[
  {
    "title": "Short clear title",
    "body": "Detailed description of what needs to be done",
    "labels": ["bug" | "feature" | "task" | "improvement"]
  }
]

If no issues found, return empty array: []

Transcript:
${transcript}
    `;

    try {
      // تم التعديل هنا للموديل الأحدث والمستقر
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        this.logger.warn('Gemini returned empty response');
        return [];
      }

      const clean = text.replace(/```json|```/g, '').trim();
      const issues: ExtractedIssue[] = JSON.parse(clean);

      this.logger.log(`Extracted ${issues.length} issues from transcript`);
      return issues;

    } catch (error) {
      this.logger.error('Gemini API failed', error);
      throw new InternalServerErrorException('AI service failed');
    }
  }
}