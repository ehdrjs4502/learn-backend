import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

export interface Post {
  id: number;
  title: string;
  content: string;
}

@Injectable()
export class AppService {
  private posts = [
    { id: 1, title: '첫 글', content: '안녕' },
    { id: 2, title: '둘째 글', content: '반가워' },
  ];

  getHello(): string {
    return 'Hello World!';
  }

  getPosts(): Post[] {
    return this.posts;
  }

  getPost(id: number) {
    const post = this.posts.find((post) => post.id === id);

    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }

    return post;
  }

  createPost(post: CreatePostDto) {
    const newPost = { id: this.posts.length + 1, ...post };
    this.posts.push(newPost);
    return newPost;
  }

  updatePost(id: number, data: UpdatePostDto) {
    const post = this.getPost(id);

    if (data.title !== undefined) post.title = data.title;
    if (data.content !== undefined) post.content = data.content;

    return post;
  }

  deletePost(id: number) {
    this.getPost(id);
    this.posts = this.posts.filter((post) => post.id !== id);
    return { deleted: true };
  }
}
