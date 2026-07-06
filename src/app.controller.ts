import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('ping')
  getPing(): string {
    return 'pong';
  }

  @Get('posts')
  getPosts(): any {
    return this.appService.getPosts();
  }

  @Get('posts/:id')
  getPost(@Param('id') id: string) {
    return this.appService.getPost(Number(id));
  }

  @Post('posts')
  createPost(@Body() body: any) {
    return this.appService.createPost(body);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() body: any) {
    return this.appService.updatePost(Number(id), body);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.appService.deletePost(Number(id));
  }
}
