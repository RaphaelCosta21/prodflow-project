import { IMembersData, ITeamMember } from "../models/member";
import { ConfigService } from "./ConfigService";

const MEMBERS_KEY = "members";
const MEMBERS_TYPE = "members";

// Members live as ONE JSON row in prodflow-config (no extra list).
export class MembersService {
  public static async getAll(): Promise<IMembersData> {
    const data = await ConfigService.getJson<IMembersData>(MEMBERS_KEY);
    return { members: data?.members ?? [] };
  }

  private static async save(members: ITeamMember[]): Promise<void> {
    await ConfigService.setJson<IMembersData>(
      MEMBERS_KEY,
      { members },
      MEMBERS_TYPE,
    );
  }

  public static async addMember(member: ITeamMember): Promise<void> {
    const { members } = await MembersService.getAll();
    const email = member.email.toLowerCase();
    if (members.some((m) => m.email.toLowerCase() === email)) {
      throw new Error("Esta pessoa já é membro do time.");
    }
    await MembersService.save([...members, member]);
  }

  public static async updateMember(member: ITeamMember): Promise<void> {
    const { members } = await MembersService.getAll();
    await MembersService.save(
      members.map((m) => (m.id === member.id ? member : m)),
    );
  }

  public static async removeMember(memberId: string): Promise<void> {
    const { members } = await MembersService.getAll();
    await MembersService.save(members.filter((m) => m.id !== memberId));
  }

  public static async findByEmail(
    email: string,
  ): Promise<ITeamMember | undefined> {
    const { members } = await MembersService.getAll();
    const target = email.toLowerCase();
    return members.filter((m) => m.email.toLowerCase() === target)[0];
  }
}
