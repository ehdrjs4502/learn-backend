import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
}
