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
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

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
  createPost(@Body() dto: CreatePostDto) {
    return this.appService.createPost(dto);
  }

  @Patch('posts/:id')
  updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.appService.updatePost(Number(id), dto);
  }

  @Delete('posts/:id')
  deletePost(@Param('id') id: string) {
    return this.appService.deletePost(Number(id));
  }
}
