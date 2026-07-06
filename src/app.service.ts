import { Injectable, NotFoundException } from '@nestjs/common';

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

  createPost(post: Omit<Post, 'id'>) {
    const newPost = { id: this.posts.length + 1, ...post };
    this.posts.push(newPost);
    return newPost;
  }

  updatePost(id: number, data: Partial<Omit<Post, 'id'>>) {
    const post = this.getPost(id); // ← 찾기+404를 재사용
    return Object.assign(post, data);
  }

  deletePost(id: number) {
    this.getPost(id);
    this.posts = this.posts.filter((post) => post.id !== id);
    return { deleted: true };
  }
}
