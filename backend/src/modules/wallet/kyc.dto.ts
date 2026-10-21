import { IsString, Length } from 'class-validator';
export class SubmitKycDto { @IsString() @Length(10, 10) panNumber: string; @IsString() @Length(6, 20) bankAccountNo: string; @IsString() @Length(11, 11) ifsc: string; @IsString() accountHolder: string; }
