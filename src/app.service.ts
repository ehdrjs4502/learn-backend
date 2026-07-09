import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX } from './database/database.module';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

export interface Post {
  id: number;
  title: string;
  content: string;
  views: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AppService {
  constructor(@Inject(KNEX) private readonly knex: Knex) {}

  getHello(): string {
    return 'Hello World!';
  }

  // 전체 조회 — Promise<Post[]>
  async getPosts(): Promise<Post[]> {
    return this.knex<Post>('posts').select('*');
  }

  // 단건 조회 + 없으면 404
  async getPost(id: number): Promise<Post> {
    const post = await this.knex<Post>('posts').where({ id }).first();
    if (!post) {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    return post;
  }

  async createPost(dto: CreatePostDto): Promise<Post> {
    // TODO: insert하면 [삽입된id]가 배열로 옴 → 구조분해로 꺼내고,
    //       getPost(id)로 방금 만든 글을 다시 조회해 반환 (DB가 채운 id·views·시각까지 담겨 옴)

    const newPost = await this.knex<Post>('posts').insert(dto);

    return this.getPost(newPost[0]);
  }

  async updatePost(id: number, dto: UpdatePostDto): Promise<Post> {
    // TODO: 먼저 getPost(id)로 존재 확인(없으면 여기서 404),
    //       update 실행 후, 갱신된 글을 getPost(id)로 다시 조회해 반환

    await this.getPost(id);

    await this.knex<Post>('posts').where({ id }).update(dto);

    return this.getPost(id);
  }

  async deletePost(id: number): Promise<{ deleted: boolean }> {
    // TODO: 존재 확인 후 del(), { deleted: true } 반환

    await this.getPost(id);

    await this.knex<Post>('posts').where({ id }).del();

    return { deleted: true };
  }
}
