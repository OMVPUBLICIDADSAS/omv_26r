import { HttpException, Injectable } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { hash, compare } from 'bcrypt'
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Users } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {

  constructor(
    @InjectModel(Users.name) private usersModel: Model<Users>,
    private jwtAuthServ: JwtService
  ) {}

 
  async create(registerUserDto: RegisterUserDto) {
    const { password } = registerUserDto;
    const plainToHash = await hash(password, Number(process.env.HASH));
    registerUserDto = {...registerUserDto, password: plainToHash};
    return this.usersModel.create(registerUserDto);
    // return 'This action adds a new user';
  }

  async login(loginUserDto: LoginUserDto) {
    //    console.log('service', registerUserDto );
    // Verifica si existe la coleccion
    if (await this.usersModel.countDocuments() === 0) {
      const plainToHash = await hash('user001', Number(process.env.HASH));
      const reguser: RegisterUserDto ={
        name: 'user', email:'user@user.user', password: plainToHash, rol: ['Q', 'P', 'U', 'C']
      }
      this.usersModel.create(reguser);
      throw new HttpException('NEW_USER_user@user.user_PASS_user001', 452);
    }
    const {email, password} = loginUserDto;
    const user = await this.usersModel.findOne({email});
    if(!user) throw new HttpException('USER_NOT_FOUND', 404);
    const checkPass = await compare(password, user.password);
    if (!checkPass) throw new HttpException('INVALID_PASSWORD', 403);

    const payload = {id: user._id, name: user.name, rol: user.rol}
    const token = this.jwtAuthServ.sign(payload);
    const data = {user, token};
    return data;
  }

  async findAll() {
    return await this.usersModel.find().exec();
  }

  async findOne(email: string) {
    return await this.usersModel.findOne({email: email}).exec();
  }

  async update(id: string, updateUserDto: RegisterUserDto) {
    // const { rol } = updateUserDto;
    const filter = { '_id': id };
    const update = {
      'name': updateUserDto.name,
      'phone': updateUserDto.phone,
      'city': updateUserDto.city,
      'rol': updateUserDto.rol };
    
    // `doc` is the document _after_ `update` was applied because of
    // `new: true`
    await this.usersModel.findOneAndUpdate(filter, update, {returnOriginal: false});
    /*
    const { rol } = updateUserDto;
    const fields = [{propName: 'rol', value: rol}];
    return await this.usersModel.findByIdAndUpdate(id, { $set: fields }, {new: true} );
    */
  }

  async remove(id: string) {
    return await this.usersModel.findByIdAndDelete(id);
  }
}
