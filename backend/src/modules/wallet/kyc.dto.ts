import { IsString, Length } from 'class-validator';

export class SubmitKycDto {
  @IsString() @Length(10, 10) panNumber: string;
  @IsString() @Length(6, 20) bankAccountNo: string;
  @IsString() @Length(11, 11) ifsc: string;
  @IsString() accountHolder: string;
}

export class WithdrawDto {
  @IsString() amount: string; // parsed to number in service; string avoids float precision issues over the wire
}
