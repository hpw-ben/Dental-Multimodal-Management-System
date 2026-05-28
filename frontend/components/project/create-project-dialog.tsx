"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Plus, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createProjectApi, type CreateProjectRequest } from "@/lib/api/projects"
import { getUsersApi } from "@/lib/api/users"
import type { User } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"

interface CreateProjectDialogProps {
  trigger?: React.ReactNode
}

export function CreateProjectDialog({ trigger }: CreateProjectDialogProps) {
  const queryClient = useQueryClient()
  
  const [open, setOpen] = React.useState(false)
  const [selectedMembers, setSelectedMembers] = React.useState<User[]>([])
  const [memberOpen, setMemberOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [error, setError] = React.useState("")

  // 获取用户列表
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsersApi(),
    enabled: open, // 只在对话框打开时获取
  })

  const users = usersData?.results || []

  // 创建项目 mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) => createProjectApi(data),
    onSuccess: () => {
      // 刷新项目列表
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      // 重置并关闭
      handleReset()
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('创建失败，请稍后重试')
      }
    },
  })

  // Toggle member selection
  const toggleMember = (user: User) => {
    if (selectedMembers.find((m) => m.id === user.id)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== user.id))
    } else {
      setSelectedMembers([...selectedMembers, user])
    }
  }

  const handleReset = () => {
    setOpen(false)
    setTitle("")
    setDescription("")
    setSelectedMembers([])
    setError("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim()) {
      setError("请输入课题名称")
      return
    }

    if (!description.trim()) {
      setError("请输入课题描述")
      return
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      member_ids: selectedMembers.map(m => m.id),
    })
  }

  const isLoading = createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            新建课题
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新建科研课题</DialogTitle>
            <DialogDescription>
              请填写新课题的基本信息。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">课题名称 <span className="text-red-500">*</span></Label>
              <Input 
                id="title" 
                placeholder="例如：口腔研究" 
                required 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">课题描述 <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                placeholder="描述该课题的研究目标、方法以及预期成果..."
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>参与成员</Label>
              <Popover open={memberOpen} onOpenChange={setMemberOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberOpen}
                    className="justify-between"
                    disabled={isLoading}
                  >
                    {selectedMembers.length > 0
                      ? `已选择 ${selectedMembers.length} 位成员`
                      : "点击选择成员..."}
                    <UserPlus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索成员姓名..." />
                    <CommandList>
                      <CommandEmpty>未找到该成员。</CommandEmpty>
                      <CommandGroup heading="可选成员">
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => toggleMember(user)}
                            className="flex items-center gap-2"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback>{user.username[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                               <span className="font-medium">{user.username}</span>
                               <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedMembers.find((m) => m.id === user.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Selected Members Preview */}
              {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                      {selectedMembers.map(member => (
                          <div key={member.id} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md text-xs">
                               <span>{member.username}</span>
                          </div>
                      ))}
                  </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={handleReset} disabled={isLoading}>
              取消
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? "创建中..." : "立即创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
