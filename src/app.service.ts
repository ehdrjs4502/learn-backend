import { Injectable } from '@nestjs/common';

interface Post {
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
    return this.posts.find((post) => post.id === id);
  }

  createPost(post: Omit<Post, 'id'>) {
    const newPost = { id: this.posts.length + 1, ...post };
    this.posts.push(newPost);
    return newPost;
  }
}
