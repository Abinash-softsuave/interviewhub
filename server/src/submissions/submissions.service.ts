import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { CodeSubmission, CodeSubmissionDocument } from './submission.schema';
import { CreateSubmissionDto } from './dto/create-submission.dto';

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  typescript: 74,
};

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(CodeSubmission.name) private submissionModel: Model<CodeSubmissionDocument>,
  ) {}

  async create(dto: CreateSubmissionDto): Promise<CodeSubmissionDocument> {
    const output = await this.executeCode(dto.language, dto.code);
    return this.submissionModel.create({ ...dto, output });
  }

  async findByInterview(interviewId: string): Promise<CodeSubmissionDocument[]> {
    return this.submissionModel.find({ interviewId }).sort({ createdAt: -1 });
  }

  private async executeCode(language: string, code: string): Promise<string> {
    const apiUrl = process.env.JUDGE0_API_URL;
    const apiKey = process.env.JUDGE0_API_KEY;

    if (!apiUrl || !apiKey) {
      return this.fallbackExecution(language, code);
    }

    const languageId = LANGUAGE_MAP[language.toLowerCase()];
    if (!languageId) return `Unsupported language: ${language}`;

    try {
      const { data: submission } = await axios.post(
        `${apiUrl}/submissions?base64_encoded=false&wait=true`,
        { source_code: code, language_id: languageId },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          },
          timeout: 15000,
        },
      );

      if (submission.stdout) return submission.stdout;
      if (submission.stderr) return `Error:\n${submission.stderr}`;
      if (submission.compile_output) return `Compilation Error:\n${submission.compile_output}`;
      return submission.status?.description || 'No output';
    } catch {
      return this.fallbackExecution(language, code);
    }
  }

  private fallbackExecution(_language: string, _code: string): string {
    return '[Judge0 API not configured] Code saved successfully. Configure JUDGE0_API_URL and JUDGE0_API_KEY in .env to enable execution.';
  }
}
